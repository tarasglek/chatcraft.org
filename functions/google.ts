import { buildUrl } from "./utils";

export async function oauthSignIn() {
  console.log("run this");

  const url = buildUrl("https://accounts.google.com/o/oauth2/v2/auth", {
    client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
    redirect_uri: "http://localhost:5173",
    response_type: "code",
    scope: "profile email",
  });
  // Redirect the user to the OAuth endpoint
  window.location.href = url;
}

export async function oauthSignIn1() {
  console.log("??????3");
  // const url = buildUrl("https://accounts.google.com/o/oauth2/token", {
  //   client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
  //   client_secret: "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",
  //   // code: code,
  //   code: "4/AfJohXkCm2BE96kgFP4u0cNRcuYzY6i-1PRiVnKd-tzCxeFj8c6BFpg5FVtxFbuvSkoVRQ",
  //   grant_type: "authorization_code",
  //   redirect_uri: "http://localhost:5173",
  // });
  // console.log(url);

  // const res = await fetch(url, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   },
  // });
  const url = "https://accounts.google.com/o/oauth2/token";
  const data = {
    client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
    client_secret: "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",
    redirect_uri: "http://localhost:5173",
    grant_type: "authorization_code",
    code: "4/AfJohXmf_ReIb8mOkU6jJa5mzQK0LrS7cZmUX0YM42uaDFWDfVEATlRRJDvckZAiWkp2WA",
  };

  const searchParams = new URLSearchParams();

  for (const prop in data) {
    searchParams.set(prop, data[prop]);
  }

  fetch(url, {
    method: "POST",
    body: searchParams.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
    .then((response) => response.json())
    .then((data) => console.log(data))
    .catch((error) => {
      console.error("Error:", error);
    });

  // console.log(res);

  const url1 = buildUrl("https://oauth2.googleapis.com/token", {
    client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
    client_secret: "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",
    // code: code,
    // code: "4%2F0AfJohXkz17cEGwB5s7R2UZtpMVQdbwYsB9ema0MXAO6zO4GEYJuXD4hoScLQbDrRNIB-_A",
    code: "4/AfJohXkyC-cwL3qyWkyVI_ie61MbhQqNSu3uJdvmB9X4E2-wIiTUWbbrtVukb5qtz8DTaQ",
    grant_type: "authorization_code",
    redirect_uri: "http://localhost:5173",
  });

  // const response = await fetch(url1, {
  //   method: "POST",
  //   headers: {
  //     "User-Agent": "chatcraft.org",
  //     Accept: "application/json",
  //   },
  // });

  // const url = "https://oauth2.googleapis.com/token";
  // const data = {
  //   client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
  //   client_secret: "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",
  //   redirect_uri: "http://localhost:5173",
  //   grant_type: "authorization_code",
  //   code: "4/AfJohXkz17cEGwB5s7R2UZtpMVQdbwYsB9ema0MXAO6zO4GEYJuXD4hoScLQbDrRNIB-_A",
  // };

  // const url = "https://oauth2.googleapis.com/token";

  // const data = new URLSearchParams();
  // data.append("grant_type", "authorization_code");
  // data.append(
  //   "client_id",
  //   "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com"
  // );
  // data.append("client_secret", "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");
  // data.append("redirect_uri", "https://openidconnect.net/callback");
  // data.append("code", "4/AfJohXkz17cEGwB5s7R2UZtpMVQdbwYsB9ema0MXAO6zO4GEYJuXD4hoScLQbDrRNIB-_A");

  // fetch(url, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   },
  //   body: data,
  // })
  //   .then((response) => response.json())
  //   .then((data) => {
  //     console.log("Response:", data);
  //   })
  //   .catch((error) => {
  //     console.error("Error:", error);
  //   });
  // const oauth2Client = new google.auth.OAuth2(
  //   "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
  //   "GOCSPX - uklMNha5jyo4gKzP4P_cAgUdwAYO",
  //   "https://openidconnect.net/callback"
  // );

  // const { tokens } = await oauth2Client.getToken(
  //   "4/AfJohXlD_eEgmjRqZWMFfBTbj-rU_pQ6rerfmmryuXfsjFp3CSuzttSuAI5Q2K-PPGwRRw"
  // );
  // console.log(tokens);

  // const data = {
  //   client_id: "YOUR_CLIENT_ID",
  //   client_secret: "YOUR_CLIENT_SECRET",
  //   // code: "4/AfJohXlEk1M4H91lucF0kqv8kErdpUlFO2b0e1kXkhLzwNx_1Ut20eZ04tMZERisPs_5GA",
  //   code: "4%2F0AfJohXlEk1M4H91lucF0kqv8kErdpUlFO2b0e1kXkhLzwNx_1Ut20eZ04tMZERisPs_5GA",
  //   grant_type: "authorization_code",
  //   redirect_uri: "YOUR_REDIRECT_URI",
  // };

  // const response = await axios.post("https://oauth2.googleapis.com/token", qs.stringify(data), {
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   },
  // });

  console.log("response:");
  // console.log(response);
  // return response.data.access_token;
}

//localhost:5173/?code=4%2F0AfJohXlEk1M4H91lucF0kqv8kErdpUlFO2b0e1kXkhLzwNx_1Ut20eZ04tMZERisPs_5GA&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+openid&authuser=0&prompt=consent

//localhost:5173/?code=4%2F0AfJohXlD_eEgmjRqZWMFfBTbj-rU_pQ6rerfmmryuXfsjFp3CSuzttSuAI5Q2K-PPGwRRw
// &scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&authuser=0&prompt=none

// async function getAccessToken(code: string) {
//   const url = buildUrl("https://oauth2.googleapis.com/token", {
//     client_id: "70478082635-iaa28pt6bg1h06ooeic3vo8fgtu90trh.apps.googleusercontent.com",
//     client_secret: "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",
//     // code: code,
//     code: "4/0AfJohXl9FH_JjS5wPFS1aOG85qcD0FBmmPDNjhLKGm7qZKB7VWvOmE5hrZWD-bE9PB7HhQ",
//     grant_type: "authorization_code",
//     redirect_uri: "http://localhost:5173",
//   });

//   const response = await fetch(url, {
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//   });

//   console.log(response);
//   return response.data.access_token;
// }

// export async function requestUserInfo(accessToken: string) {
//   const xhr = new XMLHttpRequest();
//   const url = `https://www.googleapis.com/drive/v3/about?fields=user&access_token=${accessToken}`;
//   xhr.open("Get", url);
//   // xhr.open(
//   //   "GET",
//   //   "https://www.googleapis.com/drive/v3/about?fields=user&" + "access_token=" + accessToken
//   // );
//   xhr.onreadystatechange = function () {
//     if (xhr.readyState === 4 && xhr.status === 200) {
//       const response = JSON.parse(xhr.responseText);
//       console.log(response);
//       const { login, name, avatar_url } = response;
//       const userInfo = {
//         username: login,
//         name: name ?? login,
//         avatarUrl: avatar_url,
//       };
//       console.log(userInfo);
//     } else if (xhr.readyState === 4 && xhr.status === 401) {
//       // Token invalid, so prompt for user permission.
//       oauthSignIn();
//     }
//   };

//   // xhr.onreadystatechange = function () {
//   //   console.log(xhr.response);
//   // };
//   xhr.send(null);

//   // const { login, name, avatar_url } = (await res.json()) as {
//   //   login: string;
//   //   name: string | null;
//   //   avatar_url: string;
//   // };

//   // return { username: login, name: name ?? login, avatarUrl: avatar_url };
// }
