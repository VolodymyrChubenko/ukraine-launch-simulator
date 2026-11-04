const encoder = new TextEncoder();

type SseOptions = {
  /** Called right away and then every `intervalMs`; its result is sent as JSON. */
  tick: () => unknown;
  intervalMs: number;
  /** The request's signal: the stream stops when the client disconnects. */
  signal: AbortSignal;
  event?: string;
};

export function sseResponse({ tick, intervalMs, signal, event = "message" }: SseOptions) {
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = () => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(tick())}\n\n`),
        );
      };
      const stop = () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      send();
      timer = setInterval(send, intervalMs);
      signal.addEventListener("abort", stop, { once: true });
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
