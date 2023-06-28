import { USER_ROLES } from '../constants.js';
import { pushNotification } from '../services/fcm.js';
import { KNEX, TABLES } from '../services/knex.js';

export function calculateAverage(array) {
  var total = 0;
  var count = 0;

  array.forEach(function (item) {
    total += item;
    count++;
  });

  return Number((total / count).toFixed(2));
}

export async function sendNotificationToRentalUnit({
  rentalUnitId,
  message,
  title,
  data = {},
}) {
  const residents = await KNEX(TABLES.UserRoles)
    .where({ role: USER_ROLES.RESIDENT, rentalUnitId })
    .innerJoin(
      TABLES.UserDeviceInfo,
      `${TABLES.UserDeviceInfo}.userId`,
      `${TABLES.UserRoles}.userId`,
    )
    .select(`${TABLES.UserDeviceInfo}.fcmId`);

  for (let index = 0; index < residents.length; index++) {
    const { fcmId } = residents[index];

    if (fcmId) {
      await pushNotification({
        fcmId,
        title,
        body: message,
        data,
      });
    }
  }
}

export async function sendNotificationToSocietyResidents({
  societyId,
  message,
  title,
  data = {},
}) {
  const residents = await KNEX(TABLES.UserRoles)
    .where({ role: USER_ROLES.RESIDENT, societyId })
    .innerJoin(
      TABLES.UserDeviceInfo,
      `${TABLES.UserDeviceInfo}.userId`,
      `${TABLES.UserRoles}.userId`,
    )
    .select(`${TABLES.UserDeviceInfo}.fcmId`);

  for (let index = 0; index < residents.length; index++) {
    const { fcmId } = residents[index];

    if (fcmId) {
      await pushNotification({
        fcmId,
        title,
        body: message,
        data,
      });
    }
  }
}

export async function sendNotificationToSocietyGuard({
  societyId,
  message,
  title,
  data = {},
}) {
  const guards = await KNEX(TABLES.UserRoles)
    .where({ role: USER_ROLES.SECURITY_GUARD, societyId })
    .innerJoin(
      TABLES.UserDeviceInfo,
      `${TABLES.UserDeviceInfo}.userId`,
      `${TABLES.UserRoles}.userId`,
    )
    .select(`${TABLES.UserDeviceInfo}.fcmId`);

  for (let index = 0; index < guards.length; index++) {
    const { fcmId } = guards[index];

    if (fcmId) {
      await pushNotification({
        fcmId,
        title,
        body: message,
        data,
      });
    }
  }
}
