/* eslint-disable no-undef */
export const PORT = process.env.PORT || 3000;

export const NODE_ENV = process.env.NODE_ENV || 'development';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev';

export const KNEX_CONFIG = {
  client: 'pg',
  debug: true,
  connection:
    'postgres://postgres:your_password@localhost:5432/kommunity_db',
  userParams: {
    userParam1: '451',
  },
};

export const FIREBASE_NOTIFICATION = {
  url: 'https://fcm.googleapis.com/fcm/send',
  token:
    'AAAApoQfvSU:APA91bFWiu9xeyV9oHpcSa2puHXeqZqG7IcUEsc7cApuZLJFNuHPVq4JjC8_aCZFDMBNy7X2j8Z1jySQ7LxirvHrq8YZxHH38D57XbHzET3W_k_a-GtHpnoahEye_KlcQsgj_U-o0DyF',
};

// connection:
// 'postgres://postgres:your_password@postgres:5432/postgres' ||
// 'postgresql://postgres:postgres@kommunity.cvwa1hjqm5r6.ap-south-1.rds.amazonaws.com:5432/kommunity' ||
// 'postgres://localhost/kommunity_dev',
