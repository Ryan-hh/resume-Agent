// A4 分页公共逻辑：块测量、流式分页（支持块内列表跨页拆分）、按页克隆根节点

export interface PageBlockMeasure {
  i: number; // 全局块索引
  top: number; // 相对根容器顶部的偏移
  bottom: number;
  keepNext: boolean; // 不能成为一页的最后一个块（标题需跟随内容）
  liPositions?: { top: number; bottom: number }[]; // 块内 .resume-rich li 的相对位置（全量，用于列表跨页拆分）
  liStart?: number; // 本切片从第几个 li 开始（拆分出的后缀用；整块默认 0）
}

// 从测量树收集分页块数据（顺带给每个块赋 data-page-index）
export function collectPageBlocks(root: HTMLElement): PageBlockMeasure[] {
  const raw = Array.from(root.querySelectorAll<HTMLElement>("[data-page-block]"));
  raw.forEach((el, i) => el.setAttribute("data-page-index", String(i)));
  if (raw.length === 0) return [];
  const rootRect = root.getBoundingClientRect();
  return raw.map((el, i) => {
    const r = el.getBoundingClientRect();
    // 收集块内列表项位置：列表可在页间断开的前提
    const lis = Array.from(el.querySelectorAll<HTMLElement>(".resume-rich li")).map((li) => {
      const lr = li.getBoundingClientRect();
      return { top: lr.top - rootRect.top, bottom: lr.bottom - rootRect.top };
    });
    return {
      i,
      top: r.top - rootRect.top,
      bottom: r.bottom - rootRect.top,
      keepNext: el.hasAttribute("data-keep-next"),
      liPositions: lis.length > 0 ? lis : undefined,
    };
  });
}

// 单页计划：本页保留的块索引（顺序）+ 每个块在本页保留的 li 范围 [from, to]（含，仅在块被拆分时有值）
export interface PagePlan {
  blockIds: number[];
  liLimits: Record<number, [number, number]>;
}

// 单列流式分页：块按顺序累加高度，超出一页则开新页。
// 填满优先：上一页能放下的内容一定放上（板块内部条目可在页间断开，标题不因跟随策略让位留空）。
// 列表跨页：某个块放不下时，若块内含列表项（li），按 li 拆分——当前页放能容纳的前缀 li，
// 剩余 li 作为该块的后缀切片排到下一页，避免"整块列表被挪走、当前页留大片空白"。
export function paginateBlocks(blocks: PageBlockMeasure[], pageContentH: number): PagePlan[] {
  const pages: PagePlan[] = [];
  let k = 0;
  // 注意：拆分块时会向 blocks 插入后缀切片，长度动态变化，必须用 blocks.length 实时判断
  while (k < blocks.length) {
    const page: PagePlan = { blockIds: [], liLimits: {} };
    const startTop = blocks[k].top;
    while (k < blocks.length) {
      const b = blocks[k];
      if (b.bottom - startTop <= pageContentH + 0.5) {
        // 整块放得下
        page.blockIds.push(b.i);
        // 后缀切片（liStart > 0）整块放下时，仍需限定它只保留属于自己的 li 范围
        const liStart = b.liStart ?? 0;
        if (liStart > 0 && b.liPositions) {
          page.liLimits[b.i] = [liStart, b.liPositions.length - 1];
        }
        k++;
        continue;
      }
      // 放不下：尝试按列表项拆分（块内至少 2 个 li，且能放进至少一个 li）
      const lis = b.liPositions;
      const liStart = b.liStart ?? 0;
      if (lis && lis.length - liStart >= 2) {
        let lastLi = -1;
        for (let liIdx = liStart; liIdx < lis.length; liIdx++) {
          if (lis[liIdx].bottom - startTop <= pageContentH + 0.5) lastLi = liIdx;
          else break;
        }
        // 能放进前缀、且剩余 li 不空（避免把最后一条也拆走造成死循环）
        if (lastLi >= liStart && lastLi < lis.length - 1) {
          page.blockIds.push(b.i);
          // liLimits 用块内全量 li 索引，克隆时直接按此截断
          page.liLimits[b.i] = [liStart, lastLi];
          // 后缀切片：从下一个 li 开始，排到下一页
          const suffix: PageBlockMeasure = {
            ...b,
            top: lis[lastLi + 1].top,
            liStart: lastLi + 1,
          };
          blocks.splice(k + 1, 0, suffix);
          k++;
          break;
        }
      }
      // 无法拆分（单个块自身超高 / 只有一条 li / 页内无剩余空间）：强制单独成页，避免死循环
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

// 克隆根节点，只保留本页块；被拆分的块按 li 范围截断；清理空板块容器，首块缺失时清掉内容容器顶部间距
export function clonePageRoot(root: HTMLElement, plan: PagePlan): HTMLElement {
  const keep = new Set(plan.blockIds);
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>("[data-page-block]").forEach((el) => {
    const idx = Number(el.dataset.pageIndex);
    if (!keep.has(idx)) {
      el.remove();
      return;
    }
    // 块被拆分：移除本页范围外的列表项
    const limit = plan.liLimits[idx];
    if (limit) {
      const [from, to] = limit;
      el.querySelectorAll<HTMLElement>(".resume-rich li").forEach((li, liIdx) => {
        if (liIdx < from || liIdx > to) li.remove();
      });
    }
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
