// A4 分页公共逻辑：块测量、流式分页（支持 keep-next）、按页克隆根节点

export interface PageBlockMeasure {
  i: number; // 全局块索引
  top: number; // 相对根容器顶部的偏移
  bottom: number;
  keepNext: boolean; // 不能成为一页的最后一个块（标题需跟随内容）
}

// 从测量树收集分页块数据（顺带给每个块赋 data-page-index）
export function collectPageBlocks(root: HTMLElement): PageBlockMeasure[] {
  const raw = Array.from(root.querySelectorAll<HTMLElement>("[data-page-block]"));
  raw.forEach((el, i) => el.setAttribute("data-page-index", String(i)));
  if (raw.length === 0) return [];
  const rootRect = root.getBoundingClientRect();
  return raw.map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i,
      top: r.top - rootRect.top,
      bottom: r.bottom - rootRect.top,
      keepNext: el.hasAttribute("data-keep-next"),
    };
  });
}

// 单列流式分页：块按顺序累加高度，超出一页则开新页。
// 填满优先：上一页能放下的内容一定放上（板块内部条目可在页间断开，标题不因跟随策略让位留空）
export function paginateBlocks(blocks: PageBlockMeasure[], pageContentH: number): number[][] {
  const pages: number[][] = [];
  let k = 0;
  const n = blocks.length;
  while (k < n) {
    const page: number[] = [];
    const startTop = blocks[k].top;
    while (k < n && blocks[k].bottom - startTop <= pageContentH + 0.5) {
      page.push(blocks[k].i);
      k++;
    }
    // 单个块自身超高：强制单独成页，避免死循环
    if (page.length === 0) {
      page.push(blocks[k].i);
      k++;
    }
    pages.push(page);
  }
  return pages;
}

// 克隆根节点，只保留本页块；清理空板块容器，首块缺失时清掉内容容器顶部间距
export function clonePageRoot(root: HTMLElement, keep: Set<number>): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>("[data-page-block]").forEach((el) => {
    if (!keep.has(Number(el.dataset.pageIndex))) el.remove();
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
