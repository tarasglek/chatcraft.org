// https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#redirecting
export async function oauthSignIn() {
  // export async function oauthSignIn(CLIENT_ID: string,REDIRECT_URI: string) {

  // Google's OAuth 2.0 endpoint for requesting an access token
  const oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

  // Create <form> element to submit parameters to OAuth 2.0 endpoint.
  const form = document.createElement("form");
  form.setAttribute("method", "GET"); // Send as a GET request.
  form.setAttribute("action", oauth2Endpoint);

  // Parameters to pass to OAuth 2.0 endpoint.
  const params = {
    client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com", // This is my test accout, can be used in testing on http://localhost:5173/
    redirect_uri: "http://localhost:5173",
    response_type: "token",
    scope: "profile email",
    include_granted_scopes: "true",
    state: "pass-through value",
  };

  // Add form parameters as hidden input values.
  for (const p in params) {
    const input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  // Add form to page and submit it to open the OAuth 2.0 endpoint.
  document.body.appendChild(form);
  form.submit();
}

export async function requestUserInfo(accessToken: string) {
  const xhr = new XMLHttpRequest();
  const url = `https://www.googleapis.com/drive/v3/about?fields=user&access_token=${accessToken}`;
  xhr.open("Get", url);

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      console.log(response);
      const { login, name, avatar_url } = response;
      const userInfo = {
        username: login,
        name: name ?? login,
        avatarUrl: avatar_url,
      };
      console.log(userInfo);
    } else if (xhr.readyState === 4 && xhr.status === 401) {
      // Token invalid, so prompt for user permission.
      oauthSignIn();
    }
  };

  // xhr.onreadystatechange = function () {
  //   console.log(xhr.response);
  // };
  xhr.send(null);

  // this will be used later to create user
  // const { login, name, avatar_url } = (await res.json()) as {
  //   login: string;
  //   name: string | null;
  //   avatar_url: string;
  // };

  // return { username: login, name: name ?? login, avatarUrl: avatar_url };
}
