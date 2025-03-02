export const isAtomic = (abiParameterType: string): boolean => {
  const isArray = abiParameterType.includes("[");
  if (isArray) return false;

  return (
    abiParameterType === "bool" ||
    abiParameterType === "address" ||
    !!abiParameterType.match(/(uint|int|bytes)\d+/)
  );
};
