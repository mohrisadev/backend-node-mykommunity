import admin from '../services/firebase.js';

const verifyFirebaseToken = async (token) => {
  try {
    const decodeValue = await admin.auth().verifyIdToken(token);
    if (decodeValue) {
      return { success: true, user: decodeValue };
    }

    return { success: false, message: 'Unauthorized' };
  } catch (e) {
    return { success: false, message: 'Unauthorized' };
  }
};

export default verifyFirebaseToken;
