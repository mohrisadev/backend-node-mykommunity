import { Router } from 'express';
import { SOS_STATUS, USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import {
  sendNotificationToRentalUnit,
  sendNotificationToSocietyGuard,
} from '../../../utils/helpers.js';

const router = Router();

router.post(
  '/types',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.createSosCategory);

      let { name, image = null } = req.body;

      name = name.toUpperCase();

      const [sosCategory] = await KNEX(TABLES.SosCategory).where({ name });

      if (sosCategory) throw Error('Category already present');

      await KNEX(TABLES.SosCategory).insert({ name, image });

      return res.json({
        success: true,
        message: 'SOS category created successfully',
      });
    } catch (error) {
      console.log(`Error in while creating SOS category: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/types', async (req, res) => {
  try {
    const data = await KNEX(TABLES.SosCategory).select('*');

    return res.json({ success: true, data });
  } catch (error) {
    console.log(`Error while list of SOS types: ${error}`);

    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch(
  '/types',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.updateSosCategory);

      let { sosCategoryId, name, image = null } = req.body;

      if (!name && !image) {
        throw new Error('No data provided for updation');
      }

      if (name) name = name.toUpperCase();

      const [exitingSosCategory] = await KNEX(TABLES.SosCategory)
        .where({
          id: sosCategoryId,
        })
        .limit(1);

      if (!exitingSosCategory) throw new Error('Invalid sos category id');

      if (name) {
        const [isNameTaken] = await KNEX(TABLES.SosCategory)
          .where({ name })
          .limit(1);

        if (isNameTaken) throw new Error('Category name is taken');
      }

      const updateData = {};

      if (name) updateData['name'] = name;
      if (image) updateData['image'] = image;

      await KNEX(TABLES.SosCategory)
        .where({ id: sosCategoryId })
        .update(updateData);

      return res.json({
        success: true,
        message: 'SOS category updated successfully',
      });
    } catch (error) {
      console.log(`Error in updating local-services: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// fetch SOS for a specific user
router.get('/', checkRole([USER_ROLES.RESIDENT]), async ({ user }, res) => {
  try {
    const SOSs = await KNEX(TABLES.Sos)
      .select([
        `${TABLES.Sos}.id`,
        `${TABLES.Sos}.createdAt`,
        `${TABLES.Sos}.sosCategoryId`,
        `${TABLES.Sos}.status`,
        `${TABLES.Sos}.acknowledgedAt`,
        `${TABLES.Sos}.resolvedAt`,

        `${TABLES.SosCategory}.name as sosName`,
        `${TABLES.SosCategory}.image as sosImage`,

        `${TABLES.Societies}.id as societyId`,
        `${TABLES.Societies}.name as societyName`,

        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,

        `${TABLES.Users}.id as userId`,
        `${TABLES.Users}.firstName as userFirstName`,
        `${TABLES.Users}.mobileNumber as userMobileNumber`,
      ])
      .where({ [`${TABLES.Sos}.userId`]: user.id })
      .innerJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Sos}.rentalUnitId`,
      )
      .innerJoin(
        TABLES.SosCategory,
        `${TABLES.SosCategory}.id`,
        `${TABLES.Sos}.sosCategoryId`,
      )
      .innerJoin(
        TABLES.Societies,
        `${TABLES.Societies}.id`,
        `${TABLES.Sos}.societyId`,
      )
      .innerJoin(TABLES.Users, `${TABLES.Users}.id`, `${TABLES.Sos}.userId`);

    return res.json({ success: true, data: SOSs });
  } catch (error) {
    console.log(`Error while fetching SOS: ${error}`);

    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      // validation schema
      requestValidator(body, validationSchemas.createSos);

      // fetch societyId
      const [userRole] = await KNEX(TABLES.UserRoles).where({
        role: USER_ROLES.RESIDENT,
        userId: user.id,
      });

      if (!userRole?.societyId || !userRole?.rentalUnitId)
        throw new Error('User not associated with rental unit');

      // add entry to Sos and Sos status table
      const [createdSos] = await KNEX(TABLES.Sos)
        .insert({
          userId: user.id,
          societyId: userRole.societyId,
          rentalUnitId: userRole.rentalUnitId,
          status: SOS_STATUS.CREATED,
          sosCategoryId: body.sosCategoryId,
        })
        .returning('id');

      await KNEX(TABLES.SosStatus).insert({
        name: SOS_STATUS.CREATED,
        message: 'SOS created',
        sosId: createdSos.id,
      });

      await sendNotificationToSocietyGuard({
        societyId: userRole.societyId,
        title: 'New Sos',
        message: `New SOS created by ${user.firstName}`,
      });

      return res.json({ success: true, message: 'Sos created successfully' });
    } catch (error) {
      console.log(`Error while creating SOS: ${error}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// api to acknowledge SOS
router.patch(
  '/acknowledge',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, body }, res) => {
    try {
      // validate request
      requestValidator(body, validationSchemas.acknowledgeSOS);

      const [sos] = await KNEX(TABLES.Sos)
        .where({ id: body.sosId })
        .select('societyId', 'id', 'status', 'rentalUnitId');

      if (!sos) throw new Error(`SOS not found`);

      if (
        sos?.status === SOS_STATUS.ACKNOWLEDGED ||
        sos?.status === SOS_STATUS.RESOLVED
      ) {
        throw Error('SOS already acknowledged or resolved');
      }

      // check if security guard belongs to same society
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SECURITY_GUARD })
        .select('societyId');

      if (userRole?.societyId && userRole?.societyId !== sos?.societyId)
        throw new Error(`Not permitted`);

      const acknowledgedAt = new Date().toISOString();

      await KNEX(TABLES.Sos).where({ id: body.sosId }).update({
        status: SOS_STATUS.ACKNOWLEDGED,
        acknowledgedAt,
      });

      await KNEX(TABLES.SosStatus).insert({
        sosId: body.sosId,
        name: SOS_STATUS.ACKNOWLEDGED,
        message: `SOS acknowledged by guard - ${user.id}`,
      });

      await sendNotificationToRentalUnit({
        rentalUnitId: sos.rentalUnitId,
        title: 'SOS Acknowledged',
        message: 'Your SOS has been acknowledged by security guard',
      });

      return res.json({ success: true });
    } catch (error) {
      console.log(`Error acknowledging SOS: ${error}`);

      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// api to mark SOS as resolved
router.patch(
  '/resolve',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, body }, res) => {
    try {
      // validate request
      requestValidator(body, validationSchemas.acknowledgeSOS);

      const [sos] = await KNEX(TABLES.Sos)
        .where({ id: body.sosId })
        .select('societyId', 'id', 'status', 'rentalUnitId');

      if (!sos) throw new Error(`SOS not found`);

      if (sos?.status === SOS_STATUS.RESOLVED) {
        throw Error('SOS already resolved');
      }

      // check if security guard belongs to same society
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.SECURITY_GUARD })
        .select('societyId');

      if (userRole?.societyId && userRole?.societyId !== sos?.societyId)
        throw new Error(`Not permitted`);

      const resolvedAt = new Date().toISOString();

      await KNEX(TABLES.Sos).where({ id: body.sosId }).update({
        status: SOS_STATUS.RESOLVED,
        resolvedAt,
      });

      await KNEX(TABLES.SosStatus).insert({
        sosId: body.sosId,
        name: SOS_STATUS.RESOLVED,
        message: `SOS resolved by guard - ${user.id}`,
      });

      await sendNotificationToRentalUnit({
        rentalUnitId: sos.rentalUnitId,
        title: 'SOS Resolved',
        message: 'Your SOS has been resolved by security guard',
      });

      return res.json({ success: true });
    } catch (error) {
      console.log(`Error resolving SOS: ${error}`);

      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.get(
  '/security',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, query }, res) => {
    try {
      requestValidator(query, validationSchemas.fetchSecuritySOS);

      let { isAcknowledged = null } = query;

      if (isAcknowledged === null || isAcknowledged === 'false') {
        isAcknowledged = false;
      } else isAcknowledged = true;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SECURITY_GUARD,
        })
        .select('societyId');

      if (!userRole?.societyId) throw new Error(`Not permitted`);

      const sosArray = await KNEX(TABLES.Sos)
        .select([
          `${TABLES.Sos}.id as id`,
          `${TABLES.Sos}.sosCategoryId as sosCategoryId`,
          `${TABLES.Sos}.status as status`,
          `${TABLES.Sos}.createdAt as createdAt`,
          `${TABLES.Users}.id as userId`,
          `${TABLES.Users}.firstName as firstName`,
          `${TABLES.Users}.mobileNumber as mobileNumber`,

          `${TABLES.SosCategory}.name as sosName`,
          `${TABLES.SosCategory}.image as sosImage`,
        ])
        .innerJoin(
          TABLES.SosCategory,
          `${TABLES.SosCategory}.id`,
          `${TABLES.Sos}.sosCategoryId`,
        )
        .innerJoin(TABLES.Users, `${TABLES.Users}.id`, `${TABLES.Sos}.userId`)
        .where({
          [`${TABLES.Sos}.societyId`]: userRole.societyId,
        })
        .modify((queryBuilder) => {
          if (isAcknowledged) {
            queryBuilder.whereNot(
              `${TABLES.Sos}.status`,
              '=',
              SOS_STATUS.CREATED,
            );
          } else {
            queryBuilder.where(`${TABLES.Sos}.status`, '=', SOS_STATUS.CREATED);
          }
        });

      for (const sos of sosArray) {
        // const [requiredSosFromConstants] = SOS_TYPES.filter(
        //   (e) => e.id === sos.sosId,
        // );

        // sos['sosName'] = requiredSosFromConstants.name;
        // sos['sosImage'] = requiredSosFromConstants.image;

        const [userRentalUnitId] = await KNEX(TABLES.UserRoles)
          .where({
            userId: sos.userId,
            role: USER_ROLES.RESIDENT,
          })
          .select('rentalUnitId');

        let flatInfo = {};

        if (userRentalUnitId?.rentalUnitId) {
          // populating users flat info
          [flatInfo] = await KNEX(TABLES.RentalUnits)
            .select([
              `${TABLES.RentalUnits}.name as rentalUnitName`,
              `${TABLES.Floors}.name as floorName`,
              `${TABLES.Blocks}.name as blockName`,
            ])
            .where({
              [`${TABLES.RentalUnits}.id`]: userRentalUnitId?.rentalUnitId,
            })
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
            .limit(1);
        }

        sos['userFlatInfo'] = flatInfo;
      }

      return res.json({ success: true, data: sosArray });
    } catch (error) {
      console.log(`Error while fetching SOS for security guard: ${error}`);

      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

export default router;
