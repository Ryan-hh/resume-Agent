// A4 分页公共逻辑：块测量、统一的行级流式分页、按页克隆根节点
//
// 分页策略（Word 式，单一机制）：
// 所有富文本内容——纯文本、无序列表（ul）、有序列表（ol）、列表 + 文本混合块——
// 统一按"视觉行"在页底截断：一页填满能容纳的行，剩余文字自然流到下一页。
// 不做 li 边界拆分，避免混合块（列表后跟纯文本）拆分后纯文本段无法跟进导致超高；
// 有序列表跨页时通过 ol[start] 保持序号连续。
// 断点可以落在任意文本节点内部（含单段超长文本），通过"节点 + 节点内字符偏移"精确定位。

export interface PageBlockMeasure {
  i: number; // 全局块索引
  top: number; // 相对根容器顶部的偏移
  bottom: number;
  keepNext: boolean; // 不能成为一页的最后一个块（标题需跟随内容）
  canLineCut?: boolean; // 块内含非空富文本，可在页底按"视觉行"截断（流式分页）
  textStart?: TextPos; // 本切片从文本流哪个位置开始（行级截断拆出的后缀用；整块默认 { n: 0, c: 0 }）
}

// 文本流位置：第 n 个文本节点的第 c 个字符（全量文档序）
export interface TextPos {
  n: number;
  c: number;
}

// 从测量树收集分页块数据（顺带给每个块赋 data-page-index）
export function collectPageBlocks(root: HTMLElement): PageBlockMeasure[] {
  const raw = Array.from(root.querySelectorAll<HTMLElement>("[data-page-block]"));
  raw.forEach((el, i) => el.setAttribute("data-page-index", String(i)));
  if (raw.length === 0) return [];
  const rootRect = root.getBoundingClientRect();
  return raw.map((el, i) => {
    const r = el.getBoundingClientRect();
    // 块内是否有可截断的富文本（任何非空内容都可按行在页底切断）
    const rich = el.querySelector<HTMLElement>(".resume-rich");
    return {
      i,
      top: r.top - rootRect.top,
      bottom: r.bottom - rootRect.top,
      keepNext: el.hasAttribute("data-keep-next"),
      canLineCut: !!rich && !!rich.textContent?.trim(),
    };
  });
}

// 单页计划：本页保留的块索引（顺序）+ 每个块的行级截断方案
export interface PagePlan {
  blockIds: number[];
  lineCuts?: Record<number, LineCut>; // 本页块在页底被截断（块索引 → 截断方案）
  textStarts?: Record<number, TextPos>; // 截断拆出的后缀切片整块放下时：本页从文本流哪个位置开始
}

// 行级截断方案：本页从 from 起保留到 cutBottom
export interface LineCut {
  from: TextPos; // 本页保留的起点（> {n:0,c:0} 表示上一页已显示过前面的内容）
  cutBottom: number; // 本页保留到的 y（相对根容器顶部）
  offsets: number[]; // 每个文本节点从"本页起点"起可保留的字符数（索引 < from.n 的为 -1）
  nextPos: TextPos; // 下一页起点（节点 + 节点内字符偏移）
  done: boolean; // 内容已全部放完（无需再生成后缀切片）
}

// ===== 行级截断（流式分页）=====
// 像 Word 一样在页底按"视觉行"切断：本页填满能容纳的行，剩余文字从下一页继续。

// 收集容器内全部文本节点（文档序，含空节点；原树与克隆树结构一致，索引一一对应）
function collectTextNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

// 行尾余量：字符 ink 底到"行框底"的间隙（半行距）+ 所在行容器（li/p）的 margin-bottom。
// 二分测得的是字符 ink 底，但克隆页实际渲染高度 = 行框底 + 行尾 margin，
// 不预留这两项会导致本页超高（实测 li 场景超 8px）。预算只影响截断分界，中间节点不受影响。
function lineBudget(node: Text): number {
  const host = node.parentElement?.closest("li, p") as HTMLElement | null;
  const cs = getComputedStyle(host ?? node.parentElement!);
  const fs = parseFloat(cs.fontSize) || 16;
  const lh = parseFloat(cs.lineHeight) || fs * 1.4;
  const gap = Math.max(0, (lh - fs) / 2);
  const mb = host ? parseFloat(cs.marginBottom) || 0 : 0;
  return gap + mb;
}

// 二分求文本节点从 startChar 起能放进 limitBottom（相对根顶）的最大字符数；
// bottom 随偏移单调不减，二分成立。返回值为"可保留的字符数"。
function maxTextOffset(node: Text, startChar: number, limitBottom: number, rootTop: number): number {
  const len = node.data.length;
  if (startChar >= len) return 0;
  // 预留行尾余量，保证截断后页面实际渲染高度不超过 limitBottom
  const limit = limitBottom - lineBudget(node);
  const rectAt = (off: number): number => {
    const r = document.createRange();
    r.setStart(node, startChar);
    r.setEnd(node, off);
    return r.getBoundingClientRect().bottom - rootTop;
  };
  if (rectAt(startChar + 1) > limit + 0.5) return 0;
  let lo = startChar + 1;
  let hi = len;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (rectAt(mid) <= limit + 0.5) lo = mid;
    else hi = mid - 1;
  }
  return lo - startChar;
}

// 测量某块富文本在 limitBottom 下的截断方案；一行都放不下时返回 null（避免死循环）
// from：本切片起点（文本节点索引 + 节点内偏移），测量只关心 from 之后的内容
function measureLineCut(root: HTMLElement, blockIdx: number, from: TextPos, limitBottom: number): LineCut | null {
  const el = root.querySelector<HTMLElement>(`[data-page-index="${blockIdx}"]`);
  const rich = el?.querySelector<HTMLElement>(".resume-rich");
  if (!rich) return null;
  const rootTop = root.getBoundingClientRect().top;
  const nodes = collectTextNodes(rich);
  if (nodes.length === 0) return null;
  const offsets = nodes.map((n, i) => {
    if (i < from.n) return -1;
    if (i === from.n) return maxTextOffset(n, from.c, limitBottom, rootTop);
    return maxTextOffset(n, 0, limitBottom, rootTop);
  });
  let lastKeep = -1;
  for (let i = from.n; i < offsets.length; i++) if (offsets[i] > 0) lastKeep = i;
  if (lastKeep < 0) return null;
  // 截断行的实际底部（保留的最后一个字符所在行底 + 行尾余量），作为后缀切片的起始位置
  const startCharOfLast = lastKeep === from.n ? from.c : 0;
  const r = document.createRange();
  r.setStart(nodes[lastKeep], startCharOfLast);
  r.setEnd(nodes[lastKeep], startCharOfLast + offsets[lastKeep]);
  const cutBottom = r.getBoundingClientRect().bottom - rootTop + lineBudget(nodes[lastKeep]);
  // 下一页起点：最后保留节点若被部分截断，从该节点继续；否则从下一个节点开始
  const nodeLen = nodes[lastKeep].data.length;
  const nextPos: TextPos =
    startCharOfLast + offsets[lastKeep] < nodeLen
      ? { n: lastKeep, c: startCharOfLast + offsets[lastKeep] }
      : { n: lastKeep + 1, c: 0 };
  return { from, cutBottom, offsets, nextPos, done: nextPos.n >= nodes.length };
}

// 起点落在 li 内部（上一页已显示过该 li 的开头）→ 本页是续接 li，隐藏其序号/圆点；
// 判断：起点字符 > 0（节点内从中间开始），或起点节点不是 li 内第一个文本节点（li 开头已被裁掉）
function markContLi(rich: HTMLElement, from: TextPos): void {
  const nodes = collectTextNodes(rich);
  if (from.n >= nodes.length) return;
  const node = nodes[from.n];
  const li = node.parentElement?.closest("li");
  if (!li) return;
  const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  if (from.c > 0 || first !== node) li.classList.add("resume-li-cont");
}

// 块从"中间"续接（上一页已显示过块开头）→ 本页是续接切片，隐藏块的"标题行"
// （项目/工作/教育条目的三栏头部，即 .resume-rich 前面的兄弟元素），避免跨页重复显示标题。
// .resume-rich 常被内容 wrapper 包裹：标题行 = wrapper 的前兄弟；若 rich 直接是块子元素，则是 rich 的前兄弟。
// 从块开头开始（{n:0,c:0}）表示第一页出现该块，标题保留。
function markContHead(el: HTMLElement, from: TextPos): void {
  if (from.n > 0 || from.c > 0) {
    const rich = el.querySelector<HTMLElement>(".resume-rich");
    if (!rich) return;
    let head = rich.previousElementSibling as HTMLElement | null;
    if (!head && rich.parentElement && rich.parentElement !== el) {
      head = rich.parentElement.previousElementSibling as HTMLElement | null;
    }
    if (head) head.setAttribute("data-resume-cont-hide", "true");
  }
}

// 删除节点之后的所有兄弟内容（向上到 stopAt 容器边界；stopAt 本身及其之前保留）
function removeFollowing(node: Node, stopAt: Node): void {
  let cur: Node | null = node;
  while (cur && cur !== stopAt) {
    let sib = cur.nextSibling;
    while (sib) {
      const next = sib.nextSibling;
      sib.remove();
      sib = next;
    }
    cur = cur.parentNode;
  }
}

// 删除节点之前的所有兄弟内容（向上到 stopAt 容器边界；stopAt 本身及其之后保留）
function removeBefore(node: Node, stopAt: Node): void {
  let cur: Node | null = node;
  while (cur && cur !== stopAt) {
    let sib = cur.previousSibling;
    while (sib) {
      const prev = sib.previousSibling;
      sib.remove();
      sib = prev;
    }
    cur = cur.parentNode;
  }
}

// 单列流式分页：块按顺序累加高度，超出一页则开新页。
// 填满优先：上一页能放下的内容一定放上（板块内部条目可在页间断开，标题不因跟随策略让位留空）。
// 行级截断（唯一拆分机制）：任何富文本块放不下时，按视觉行在页底切断——本页填满，剩余流到下一页；
// 若内容已全部放完（done）则不再生成后缀切片。传入 root 时启用行级截断；无 root 退化为整块成页。
export function paginateBlocks(blocks: PageBlockMeasure[], pageContentH: number, root?: HTMLElement): PagePlan[] {
  const pages: PagePlan[] = [];
  let k = 0;
  // 注意：拆分块时会向 blocks 插入后缀切片，长度动态变化，必须用 blocks.length 实时判断
  while (k < blocks.length) {
    const page: PagePlan = { blockIds: [] };
    const startTop = blocks[k].top;
    while (k < blocks.length) {
      const b = blocks[k];
      if (b.bottom - startTop <= pageContentH + 0.5) {
        // 整块放得下
        page.blockIds.push(b.i);
        // 行级截断的后缀切片（textStart > 0）整块放下时，需从自己的文本起点开始，避免重复渲染已显示内容
        const textStart = b.textStart;
        if (textStart && (textStart.n > 0 || textStart.c > 0)) {
          page.textStarts = page.textStarts || {};
          page.textStarts[b.i] = textStart;
        }
        k++;
        continue;
      }
      // 放不下：按视觉行截断——本页填满能容纳的行，剩余流到下一页（覆盖纯文本/列表/混合块一切情况）
      if (b.canLineCut && root) {
        const cut = measureLineCut(root, b.i, b.textStart ?? { n: 0, c: 0 }, startTop + pageContentH);
        // 至少推进一行高度（8px 阈值防死循环）；一行都放不下时返回 null 走下方整块逻辑
        if (cut && cut.cutBottom > b.top + 8) {
          page.blockIds.push(b.i);
          page.lineCuts = page.lineCuts || {};
          page.lineCuts[b.i] = cut;
          // 后缀切片：从截断点继续（仍超高则下一页会再次行级截断，逐页推进）；
          // 内容已放完（done）则不留后缀
          if (!cut.done) {
            blocks.splice(k + 1, 0, { ...b, top: cut.cutBottom, textStart: cut.nextPos });
          }
          k++;
          break;
        }
      }
      // 无法拆分（单个块自身超高 / 页内无剩余空间）：强制单独成页，避免死循环
      if (page.blockIds.length === 0) {
        page.blockIds.push(b.i);
        k++;
      }
      break;
    }
    pages.push(page);
  }
  return pages;
}

// 克隆根节点，只保留本页块；被截断的块按文本起点/截断点裁剪；有序列表跨页序号连续；清理空板块容器
export function clonePageRoot(root: HTMLElement, plan: PagePlan): HTMLElement {
  const keep = new Set(plan.blockIds);
  const clone = root.cloneNode(true) as HTMLElement;

  // 截断前：给每个 ol 的 li 按原始序号打标（截断后据此恢复 ol[start]，保证跨页序号连续）
  clone.querySelectorAll("ol").forEach((ol) => {
    Array.from(ol.querySelectorAll("li")).forEach((li, liIdx) => {
      li.setAttribute("data-oli", String(liIdx));
    });
  });

  clone.querySelectorAll<HTMLElement>("[data-page-block]").forEach((el) => {
    const idx = Number(el.dataset.pageIndex);
    if (!keep.has(idx)) {
      el.remove();
      return;
    }
    // 行级截断的后缀切片整块放下：先标记续接 li（隐藏序号），再去掉起点之前的文本（上一页已显示的部分），避免重复
    const ts = plan.textStarts?.[idx];
    if (ts) {
      const rich = el.querySelector<HTMLElement>(".resume-rich");
      if (rich) {
        markContLi(rich, ts);
        markContHead(el, ts);
        const nodes = collectTextNodes(rich);
        if (ts.n < nodes.length) {
          removeBefore(nodes[ts.n], rich);
          if (ts.c > 0) nodes[ts.n].data = nodes[ts.n].data.slice(ts.c);
        } else {
          rich.innerHTML = "";
        }
      }
    }
    // 块被行级截断：先标记续接 li，再按测量偏移截断文本，删除截断点之后的内容
    const cut = plan.lineCuts?.[idx];
    if (cut) {
      const rich = el.querySelector<HTMLElement>(".resume-rich");
      if (rich) {
        markContLi(rich, cut.from);
        markContHead(el, cut.from);
        const nodes = collectTextNodes(rich);
        let lastKeep = -1;
        for (let i = cut.from.n; i < cut.offsets.length && i < nodes.length; i++) {
          if (cut.offsets[i] > 0) lastKeep = i;
        }
        if (lastKeep >= 0) {
          // 起点裁剪：去掉上一页已显示的内容（节点及其之前的兄弟 + 节点内的起始字符）
          if (cut.from.n > 0 && cut.from.n < nodes.length) {
            removeBefore(nodes[cut.from.n], rich);
          }
          if (cut.from.c > 0 && cut.from.n < nodes.length) {
            nodes[cut.from.n].data = nodes[cut.from.n].data.slice(cut.from.c);
          }
          // 尾部截断：保留到 offsets[lastKeep]（相对本页起点），并移除其后的全部内容
          nodes[lastKeep].data = nodes[lastKeep].data.slice(0, cut.offsets[lastKeep]);
          removeFollowing(nodes[lastKeep], rich);
        } else {
          // 一行都放不下（理论不会触发）：清空该块富文本
          rich.innerHTML = "";
        }
      }
    }
  });

  // 有序列表序号连续性：被拆到本页的 ol 从保留的第一项原始序号重新编号
  clone.querySelectorAll("ol").forEach((ol) => {
    const first = ol.querySelector("li");
    const start = first ? Number(first.getAttribute("data-oli") ?? 0) + 1 : 1;
    if (start > 1) ol.setAttribute("start", String(start));
    else ol.removeAttribute("start");
  });

  if (!keep.has(0)) {
    Array.from(clone.children).forEach((child) => {
      const c = child as HTMLElement;
      if (!c.hasAttribute("data-page-block")) {
        c.style.marginTop = "0px";
      }
    });
  }
  // 空板块容器（其内无分页块）整块移除，避免留下多余间距
  clone.querySelectorAll<HTMLElement>("[data-section-wrapper]").forEach((el) => {
    if (!el.querySelector("[data-page-block]")) el.remove();
  });
  return clone;
}
