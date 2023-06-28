import axios from 'axios';
import { FIREBASE_NOTIFICATION } from '../env.js';

export const pushNotification = async ({
  fcmId,
  title,
  body,
  image = null,
  data = {},
}) => {
  try {
    if (!fcmId || !body || !title)
      throw Error('Please enter a valid body and fcmId');

    console.log('Sending push notification with title ', title);

    const payload = {
      to: fcmId,
      notification: {
        title,
        body,
      },
      data,
    };

    if (image) {
      payload.notification.image = image;
    }

    const response = await axios.post(`${FIREBASE_NOTIFICATION.url}`, payload, {
      headers: { Authorization: `Bearer ${FIREBASE_NOTIFICATION.token}` },
    });

    console.log(`FCM: ${JSON.stringify(response.data)} | token: ${fcmId}`);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
