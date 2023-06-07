function useMessages() {
  return {
    // TODO: need to fix how token info gets calculated with refactor to use Chat vs. Messages
    tokenInfo: {
      count: 0,
      cost: 0,
    },
  };
}

export default useMessages;
