import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, redirect } from "react-router-dom";

import { LocalChat, RemoteChat } from "./Chat";
import { loadShare } from "./lib/share";
import { ChatCraftChat } from "./lib/ChatCraftChat";
import Search, { loader as searchLoader } from "./Search";
import db from "./lib/db";
import { ChatCraftFunction, initialFunctionCode } from "./lib/ChatCraftFunction";
import AppError from "./AppError";

// We won't usually need the Function component (editor), so lazily load it
const Function = lazy(() => import("./Function"));

export default createBrowserRouter([
  // Load the user's most recent chat, or start a new one the first time
  {
    path: "/",
    async loader() {
      // Because google will redirect_uri to "/" with accessToken
      const requestedURI = location.pathname;
      // Accessing anchor values
      const anchor = location.hash.substring(1); // Exclude the '#' character
      console.log("Requested URI:", requestedURI);
      console.log("Anchor:", anchor);
      const match = anchor.match(/access_token=([^&]*)/);
      const accessToken = match ? match[1] : null;
      console.log("accessToken:", accessToken);
      const xhr = new XMLHttpRequest();
      xhr.open(
        "GET",
        "https://www.googleapis.com/drive/v3/about?fields=user&" + "access_token=" + accessToken
      );
      xhr.onreadystatechange = function () {
        console.log(xhr.response);
      };
      xhr.send(null);

      try {
        const recentChat = await db.chats.orderBy("date").last();
        if (recentChat) {
          return redirect(`/c/${recentChat.id}`);
        }
      } catch (err) {
        console.warn("Error getting most recent chat", err);
      }
      return redirect("/new");
    },
    errorElement: <AppError />,
  },
  // Create a new chat
  {
    path: "/new",
    async loader() {
      const chat = new ChatCraftChat();
      await chat.save();
      return redirect(`/c/${chat.id}`);
    },
    errorElement: <AppError />,
  },
  {
    path: "/c/new",
    async loader() {
      const chat = new ChatCraftChat();
      await chat.save();
      return redirect(`/c/${chat.id}`);
    },
    errorElement: <AppError />,
  },

  // People shouldn't end-up here, so create a new chat if they do
  {
    path: "/c",
    element: <Navigate to="/new" />,
  },
  {
    path: "/c/new",
    element: <Navigate to="/new" />,
  },
  // Load a chat from the local db, making sure it exists first
  {
    path: "/c/:id",
    async loader({ params }) {
      // If we try to load a chat, and it doesn't exist, create it first
      // so that we have something to render.
      const { id } = params;
      if (id && !(await ChatCraftChat.find(id))) {
        const chat = new ChatCraftChat({ id });
        await chat.save();
      }
      return id;
    },
    element: <LocalChat />,
    errorElement: <AppError />,
  },
  // Delete a chat from the local db
  {
    path: "/c/:id/delete",
    async action({ params }) {
      const { id } = params;
      if (id) {
        try {
          await ChatCraftChat.delete(id);
        } catch (err) {
          console.warn("Unable to delete chat", { id, err });
        }
      }
      return redirect("/");
    },
  },
  // Fork an existing local chat and redirect to it. If a `messageId` is included,
  // use that as our starting message vs. whole chat (partial fork)
  {
    path: "/c/:chatId/fork/:messageId?",
    async loader({ params }) {
      const { chatId, messageId } = params;

      if (!chatId) {
        // Shouldn't happen, don't crash
        console.error("No chatId passed to /fork");
        return redirect("/new");
      }

      const chat = await ChatCraftChat.find(chatId);
      if (!chat) {
        console.error("Couldn't find chat with given chatId");
        return redirect("/new");
      }

      // Pass the starting message id, if we have one
      const forked = await chat.fork(messageId);
      if (!forked) {
        console.error("Couldn't fork");
        return redirect("/new");
      }

      return redirect(`/c/${forked.id}`);
    },
    errorElement: <AppError />,
  },

  // Loading a shared chat remotely as JSON, which will be readonly
  {
    path: "/c/:user/:chatId",
    async loader({ params }) {
      const { user, chatId } = params;
      if (!(user && chatId)) {
        return redirect("/");
      }

      try {
        return loadShare(user, chatId);
      } catch (err) {
        console.warn(`Error loading shared chat ${user}/${chatId}`, err);
        redirect(`/`);
      }
    },
    element: <RemoteChat />,
    errorElement: <AppError />,
  },

  // Fork a remote chat into the local db
  {
    path: "/c/:user/:chatId/fork/:messageId?",
    async loader({ params }) {
      const { user, chatId, messageId } = params;

      if (!user) {
        // Shouldn't happen, don't crash
        console.error("No user info for remote chat to /fork");
        return redirect("/new");
      }

      if (!chatId) {
        // Shouldn't happen, don't crash
        console.error("No chatId passed to /fork");
        return redirect("/new");
      }

      // Load the chat remotely
      let chat;
      try {
        chat = await loadShare(user, chatId);
      } catch (err) {
        console.warn(`Error loading shared chat ${user}/${chatId}`, err);
        redirect(`/`);
      }

      if (!chat) {
        console.error("Couldn't load remote chat with given chatId");
        return redirect("/new");
      }

      // Pass the starting message id, if we have one
      const forked = await chat.fork(messageId);
      if (!forked) {
        console.error("Couldn't fork");
        return redirect("/new");
      }

      return redirect(`/c/${forked.id}`);
    },
    errorElement: <AppError />,
  },

  // Search. Process `GET /s?q=...` and return results
  {
    path: "/s",
    loader: searchLoader,
    element: <Search />,
    errorElement: <AppError />,
  },

  // Functions
  {
    path: "/f/new",
    async loader() {
      const func = await ChatCraftFunction.parse(initialFunctionCode);
      await func.save();
      return redirect(`/f/${func.id}`);
    },
    errorElement: <AppError />,
  },
  // People shouldn't end-up here, so create a new function if they do
  {
    path: "/f",
    element: <Navigate to="/f/new" />,
    errorElement: <AppError />,
  },
  // Load a function from the local db, making sure it exists first
  {
    path: "/f/:id",
    async loader({ params }) {
      // If we try to load a function, and it doesn't exist, create it first
      // so that we have something to render.
      const { id } = params;
      if (id && !(await ChatCraftFunction.find(id))) {
        const func = await ChatCraftFunction.parse(initialFunctionCode);
        func.id = id;
        await func.save();
      }
      return id;
    },
    element: (
      // We load the <Function/> component lazily, so wait on it to be ready
      <Suspense fallback={null}>
        <Function />
      </Suspense>
    ),
    errorElement: <AppError />,
  },
  // Delete a function from the local db
  {
    path: "/f/:id/delete",
    async action({ params }) {
      const { id } = params;
      if (id) {
        try {
          await ChatCraftFunction.delete(id);
        } catch (err) {
          console.warn("Unable to delete function", { id, err });
        }
      }
      return redirect("/");
    },
  },
]);
