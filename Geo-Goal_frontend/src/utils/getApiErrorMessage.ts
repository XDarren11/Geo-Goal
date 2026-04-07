export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error"): string {
  const maybeError = error as any;

  return (
    maybeError?.response?.data?.error ||
    maybeError?.response?.data?.message ||
    maybeError?.message ||
    fallback
  );
}
