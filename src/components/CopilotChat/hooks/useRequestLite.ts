import { useCallback, useRef, useState } from 'react';

/** 极简 useRequest：只保留组件需要的 loading/run，避免依赖 Umi 插件。 */
export function useRequestLite<TArgs extends any[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, args: TArgs) => void;
    onError?: (error: unknown) => void;
  },
) {
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(async (...args: TArgs): Promise<TData> => {
    setLoading(true);
    try {
      const data = await fnRef.current(...args);
      optionsRef.current?.onSuccess?.(data, args);
      return data;
    } catch (error) {
      optionsRef.current?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, run };
}
