/**
   * 平滑滚动到顶部
   * @param scrollbars 滚动条实例
   * @param duration 滚动持续时间（毫秒）
   *  根据常见 UI/UX 规范（Material、iOS、Web 交互经验），常用时间如下：
   *  场景	                      推荐时长
   *  短滚动距离（100 ~ 400px）	    200–300ms
   *  中等滚动距离（400 ~ 1000px）	300–500ms
   *  长距离滚动到顶部          	  500–800ms 最顺眼
   *  超长页面（聊天记录、日志）	    动态时长，而不是固定
   */
  export function smoothScrollToTop(scrollbars: any, duration = 600) {
    if (!scrollbars) return;
    const el = scrollbars.view; // 真实 DOM

    if (!el) return;

    const start = el.scrollTop;
    const startTime = performance.now();

    // 缓动（easing）函数
    function easeInOutQuad(t: number) {
      // 当 t 从 0 → 0.5 时采用加速曲线（2*t*t）
      // 当 t 从 0.5 → 1 时采用减速曲线（-1 + (4 - 2*t)*t）
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // 动画帧回调
    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(t);

      const target = start * (1 - eased);
      scrollbars.scrollTop(target);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }