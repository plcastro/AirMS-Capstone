// index.js
import { registerRootComponent } from "expo";
import messaging from "@react-native-firebase/messaging";
import App from "./App";
import { enqueuePushMessage } from "./utilities/pushInbox";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Message handled in background!", remoteMessage);
  await enqueuePushMessage(remoteMessage);
});

registerRootComponent(App);
