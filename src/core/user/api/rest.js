import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { pushNotification } from '../../../services/fcm.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.get('/profile', async ({ user }, res) => {
  try {
    const userDataPromise = KNEX(TABLES.Users)
      .where({ id: user.id })
      .select([
        'id',
        'email',
        'mobileNumber',
        'disabled',
        'firstName',
        'lastName',
        'middleName',
        'profileImage',
      ]);

    const userRolePromise = KNEX(TABLES.UserRoles)
      .select(
        'role',
        'societyId',
        'rentalUnitId',
        'status',
        'guardCode as securityGuardCode',
      )
      .where({ userId: user.id })
      .whereIn('role', [
        USER_ROLES.RESIDENT,
        USER_ROLES.SECURITY_GUARD,
        USER_ROLES.SOCIETY_ADMIN,
      ])
      .limit(1);

    let [[userData], [userRole]] = await Promise.all([
      userDataPromise,
      userRolePromise,
    ]);

    let rentalUnitData;
    if (userRole?.rentalUnitId) {
      [rentalUnitData] = await KNEX(TABLES.RentalUnits)
        .where({ [`${TABLES.RentalUnits}.id`]: userRole.rentalUnitId })
        .select([
          `${TABLES.RentalUnits}.id as rentalUnitId`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.type as rentalUnitType`,
          `${TABLES.Floors}.id as floorId`,
          `${TABLES.Floors}.name as floorName`,
          `${TABLES.Blocks}.id as blockId`,
          `${TABLES.Blocks}.name as blockName`,
          `${TABLES.Societies}.id as societyId`,
          `${TABLES.Societies}.name as societyName`,
          `${TABLES.Societies}.address as societyAddress`,
          `${TABLES.Cities}.id as cityId`,
          `${TABLES.Cities}.name as cityName`,
        ])
        .innerJoin(
          TABLES.Floors,
          `${TABLES.Floors}.id`,
          `${TABLES.RentalUnits}.floorId`,
        )
        .innerJoin(
          TABLES.Blocks,
          `${TABLES.Blocks}.id`,
          `${TABLES.Floors}.blockId`,
        )
        .innerJoin(
          TABLES.Societies,
          `${TABLES.Societies}.id`,
          `${TABLES.RentalUnits}.societyId`,
        )
        .innerJoin(
          TABLES.Cities,
          `${TABLES.Cities}.id`,
          `${TABLES.Societies}.cityId`,
        );
    }

    userData['role'] = userRole?.role;
    userData['societyId'] = userRole?.societyId;
    userData['rentalUnitId'] = userRole?.rentalUnitId;
    userData['rentalUnitStatus'] = userRole?.status || 'NOT_APPLIED';

    if (rentalUnitData) {
      userData = { ...userData, ...rentalUnitData };
    }

    return res.json({ success: true, data: userData });
  } catch (error) {
    console.log(`Error fetching user profile: ${error}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// API to update user email and name
router.patch('/profile', async ({ user, body }, res) => {
  try {
    requestValidator(body, validationSchemas.updateProfile);

    if (body?.email) {
      const [isEmailTaken] = await KNEX(TABLES.Users)
        .whereNot({ id: user.id })
        .where({ email: body.email })
        .limit(1);

      if (isEmailTaken)
        throw new Error('Provided email is linked to another user');
    }

    // for (const key of Object.keys(body)) {
    //   if (userDetails?.[key] && key != 'profileImage') {
    //     throw new Error(`${key} already exists`);
    //   }
    // }

    await KNEX(TABLES.Users).where({ id: user.id }).update(body);

    return res.json({ success: true });
  } catch (error) {
    console.log(`Error updating user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get(
  '/residents',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.query, validationSchemas.fetchResidents);

      const { societyId } = req.query;

      const residents = await KNEX(TABLES.UserRoles)
        .select([
          `${TABLES.Users}.firstName`,
          `${TABLES.Users}.lastName`,
          `${TABLES.Users}.email`,
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.Users}.id as userId`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.type as rentalUnitType`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.UserRoles}.role`,
          `${TABLES.UserRoles}.id as userRoleId`,
          `${TABLES.UserRoles}.status as rentalUnitStatus`,
          `${TABLES.UserRoles}.isOwner`,
        ])
        .where({
          role: USER_ROLES.RESIDENT,
          [`${TABLES.RentalUnits}.societyId`]: societyId,
        })
        .leftJoin(
          TABLES.RentalUnits,
          `${TABLES.RentalUnits}.id`,
          `${TABLES.UserRoles}.rentalUnitId`,
        )
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.UserRoles}.userId`,
        );

      return res.json({ success: true, data: residents });
    } catch (error) {
      console.log(`Error fetching all residents: ${error}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/resident-directory', async ({ user }, res) => {
  try {
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({ userId: user.id })
      .whereNotNull('societyId')
      .limit(1);

    if (!userRole?.societyId) {
      throw Error('User not linked to any society');
    }

    const residents = await KNEX(TABLES.UserRoles)
      .where({
        [`${TABLES.UserRoles}.societyId`]: userRole.societyId,
        role: USER_ROLES.RESIDENT,
      })
      .select([
        `${TABLES.UserRoles}.isOwner`,
        `${TABLES.Users}.firstName`,
        `${TABLES.Users}.lastName`,
        `${TABLES.Users}.mobileNumber`,
        `${TABLES.Users}.id as userId`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
      ])
      .innerJoin(
        TABLES.Users,
        `${TABLES.Users}.id`,
        `${TABLES.UserRoles}.userId`,
      )
      .innerJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.UserRoles}.rentalUnitId`,
      )
      .innerJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .innerJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      );

    residents.forEach((resident) => {
      resident[
        'flatKey'
      ] = `${resident.rentalUnitName}, ${resident.floorName}, ${resident.blockName}`;
    });

    return res.json({ success: true, data: residents });
  } catch (error) {
    console.log(`Error while fetching resident directory - ${error.message}`);

    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/fcm', async ({ user, body }, res) => {
  try {
    const { fcmId } = body;

    if (!fcmId) {
      throw new Error(`Invalid fcm id`);
    }

    const [userDevice] = await KNEX(TABLES.UserDeviceInfo)
      .where({ userId: user.id })
      .limit(1);

    if (!userDevice) {
      await KNEX(TABLES.UserDeviceInfo).insert({ userId: user.id, fcmId });
    } else {
      await KNEX(TABLES.UserDeviceInfo)
        .update({ fcmId })
        .where({ userId: user.id });
    }

    return res.json({ success: true });
  } catch (error) {
    console.log(`Error while storing fcm id - ${error.message}`);

    return res.status(500).json({ success: false, message: error.message });
  }
});

// todo: remove this api after testing
router.post('/send-test-notification', async (req, res) => {
  try {
    const { body } = req;

    const { fcmId, title, notificationBody, image, data } = body;

    const notificationData = await pushNotification({
      fcmId,
      title,
      body: notificationBody,
      image,
      data,
    });

    console.log(notificationData.data.results);

    return res.json({ success: true });
  } catch (error) {
    console.log(`Error while sending test notifications - ${error.message}`);

    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch(
  '/resident',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.updateResident);

      const { userId, firstName, lastName, email, isOwner } = body;

      const [user] = await KNEX(TABLES.Users).where({ id: userId }).limit(1);

      if (!user) {
        throw new Error(`User not found`);
      }

      if (firstName || lastName || email) {
        await KNEX(TABLES.Users)
          .update({
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            email: email || user.email,
          })
          .where({ id: userId });
      }

      if (typeof isOwner === 'boolean') {
        await KNEX(TABLES.UserRoles)
          .where({ userId, role: USER_ROLES.RESIDENT })
          .update({ isOwner });
      }

      return res.json({ success: true });
    } catch (error) {
      console.log(`Error while fetching resident directory - ${error.message}`);

      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

export default router;
