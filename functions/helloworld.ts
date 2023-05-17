export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  console.log(`[LOGGING FROM /helloworld]: Request came from ${request.url}`);

  return new Response("hello world");
};
