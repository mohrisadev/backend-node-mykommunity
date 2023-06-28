// todo: ask paras to add a check that one user linked to one rental unit only
import { Router } from 'express';
import moment from 'moment';
import {
  LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES,
  LOCAL_SERVICE_PROVIDER_RATING_CATEGORIES,
  USER_ROLES,
} from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { calculateAverage } from '../../../utils/helpers.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import { sendNotificationForLocalServiceProvider } from '../utils/helper.js';

const router = Router();

// create local service provider
router.post(
  '/',
  checkRole([
    USER_ROLES.SOCIETY_ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.SECURITY_GUARD,
  ]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.createLocalServiceProvider);

      const {
        localServiceId,
        name,
        mobileNumber,
        image,
        societyId,
        localServiceProviderCode,
      } = req.body;

      // checking if localServiceId is valid
      const [localService] = await KNEX(TABLES.LocalServices).where({
        id: localServiceId,
      });

      if (!localService) throw Error('Invalid local service category selected');

      const [society] = await KNEX(TABLES.Societies).where({ id: societyId });

      if (!society) throw Error('Invalid society');

      const [islocalServiceProviderPresent] = await KNEX(
        TABLES.LocalServiceProviders,
      ).where({ mobileNumber, localServiceId });

      if (islocalServiceProviderPresent) {
        throw Error(
          'Another local service provider is present with the same mobile number',
        );
      }

      const [islocalServiceProviderCodeTaken] = await KNEX(
        TABLES.LocalServiceProviders,
      )
        .where({ localServiceProviderCode })
        .limit(1);

      if (islocalServiceProviderCodeTaken) throw Error('Code is already taken');

      const [createdLocalServiceProvider] = await KNEX(
        TABLES.LocalServiceProviders,
      )
        .insert({
          localServiceId,
          name,
          mobileNumber,
          image,
          societyId,
          localServiceProviderCode,
        })
        .returning('id');

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        localServiceProviderId: createdLocalServiceProvider.id,
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.LOCAL_SERVICE_PROVIDER_CREATED,
        message: 'Local service provider created',
      });

      return res.json({
        success: true,
        message: 'Local service provider created',
      });
    } catch (error) {
      console.log(
        `Error while creating local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error.info,
      });
    }
  },
);

router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.updateLocalServiceProvider);

      const {
        localServiceId,
        name,
        mobileNumber,
        image,
        localServiceProviderId,
      } = req.body;

      if (!name && !image && !localServiceId && !mobileNumber) {
        throw new Error('No data provided for updation');
      }

      // checking if local service provider is valid
      const [localServiceProvider] = await KNEX(TABLES.LocalServiceProviders)
        .where({
          id: localServiceProviderId,
        })
        .limit(1);

      if (!localServiceProvider)
        throw new Error(`Local service provider not present`);

      // checking if localServiceId is valid
      if (localServiceId) {
        const [localService] = await KNEX(TABLES.LocalServices).where({
          id: localServiceId,
        });

        if (!localService)
          throw Error('Invalid local service category selected');
      }

      if (mobileNumber) {
        const [islocalServiceProviderPresent] = await KNEX(
          TABLES.LocalServiceProviders,
        )
          .where({ mobileNumber })
          .select('id')
          .limit(1);

        if (islocalServiceProviderPresent) {
          throw Error(
            'Another local service provider is present with the same mobile number',
          );
        }
      }

      const updateObj = {};

      if (name) updateObj.name = name;
      if (localServiceId) updateObj.localServiceId = localServiceId;
      if (mobileNumber) updateObj.mobileNumber = mobileNumber;
      if (image) updateObj.image = image;

      const [updatedLocalServiceProvider] = await KNEX(
        TABLES.LocalServiceProviders,
      )
        .where({ id: localServiceProviderId })
        .update(updateObj)
        .returning('id');

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        localServiceProviderId: updatedLocalServiceProvider.id,
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.LOCAL_SERVICE_PROVIDER_UPDATED,
        message: `Local service provider updated with data: ${JSON.stringify(
          req.body,
        )} by user: ${req.user.id}`,
      });

      return res.json({
        success: true,
        message: 'Local service provider updated',
      });
    } catch (error) {
      console.log(
        `Error while updating local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error.info,
      });
    }
  },
);

router.get(
  '/registered',
  checkRole([USER_ROLES.RESIDENT]),
  async (req, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: req.user.id,
          role: USER_ROLES.RESIDENT,
        })
        .select('rentalUnitId')
        .limit(1);

      if (!userRole?.rentalUnitId) {
        throw Error('User not linked to any rental unit');
      }

      const localServiceProviders = await KNEX(TABLES.LocalServiceProviders)
        .innerJoin(
          TABLES.LocalServices,
          `${TABLES.LocalServiceProviders}.localServiceId`,
          `${TABLES.LocalServices}.id`,
        )
        .innerJoin(
          TABLES.LocalServiceProviderAndRentalUnits,
          `${TABLES.LocalServiceProviders}.id`,
          `${TABLES.LocalServiceProviderAndRentalUnits}.localServiceProviderId`,
        )
        .where({
          [`${TABLES.LocalServiceProviderAndRentalUnits}.rentalUnitId`]:
            userRole.rentalUnitId,
          [`${TABLES.LocalServiceProviderAndRentalUnits}.isActive`]: true,
        })
        .select([
          `${TABLES.LocalServiceProviderAndRentalUnits}.id as localServiceProviderAndRentalUnitId`,
          `${TABLES.LocalServiceProviders}.name`,
          `${TABLES.LocalServiceProviders}.mobileNumber`,
          `${TABLES.LocalServiceProviders}.image`,
          `${TABLES.LocalServiceProviders}.isInside`,
          `${TABLES.LocalServiceProviders}.localServiceProviderCode`,
          `${TABLES.LocalServiceProviders}.id`,
          `${TABLES.LocalServices}.name as category`,
        ]);

      return res.json({ success: true, data: localServiceProviders });
    } catch (error) {
      console.log(
        `Error while fetching local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/', async (req, res) => {
  try {
    const { societyId, type = 'ALL' } = req.query;
    if (!societyId) throw Error('Invalid society selected');

    // checking if user has permission for the society
    const [isPermitted] = await KNEX(TABLES.UserRoles)
      .where({
        userId: req.user.id,
        societyId,
      })
      .limit(1);

    const [isSuperAdmin] = await KNEX(TABLES.UserRoles)
      .where({
        userId: req.user.id,
        role: USER_ROLES.SUPER_ADMIN,
      })
      .limit(1);

    if (!isPermitted && !isSuperAdmin) {
      throw Error('Requested resource not found');
    }

    const [society] = await KNEX(TABLES.Societies).where({ id: societyId });

    if (!society) throw Error('Invalid society');

    const localServiceProviders = await KNEX(TABLES.LocalServiceProviders)
      .innerJoin(
        TABLES.LocalServices,
        `${TABLES.LocalServiceProviders}.localServiceId`,
        `${TABLES.LocalServices}.id`,
      )
      .where(`${TABLES.LocalServiceProviders}.societyId`, '=', societyId)
      .modify((queryBuilder) => {
        if (type === 'ENTRY') queryBuilder.where({ isInside: false });
        if (type === 'EXIT') queryBuilder.where({ isInside: true });
      })
      .select([
        `${TABLES.LocalServiceProviders}.name`,
        `${TABLES.LocalServiceProviders}.mobileNumber`,
        `${TABLES.LocalServiceProviders}.image`,
        `${TABLES.LocalServiceProviders}.isInside`,
        `${TABLES.LocalServiceProviders}.localServiceProviderCode`,
        `${TABLES.LocalServiceProviders}.id`,
        `${TABLES.LocalServices}.name as category`,
      ]);

    return res.json({ success: true, data: localServiceProviders });
  } catch (error) {
    console.log(
      `Error while fetching local service provider: ${error.message}`,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post(
  '/hire',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.localServiceProviderHirirng);

      const { localServiceProviderId } = body;

      // find rental unit from user, and if not present throw error
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1);

      if (!userRole?.rentalUnitId)
        throw Error('User not associated with any rental unit');

      // check if the provider already present in that house
      const [isProviderAlreadyAssociated] = await KNEX(
        TABLES.LocalServiceProviderAndRentalUnits,
      )
        .where({
          rentalUnitId: userRole?.rentalUnitId,
          localServiceProviderId,
        })
        .limit(1);

      if (isProviderAlreadyAssociated?.isActive) {
        throw Error('Local service provider already registered');
      }

      // check if already associated then make isActive true and add to logs else make new entry
      if (
        isProviderAlreadyAssociated &&
        isProviderAlreadyAssociated?.isActive == false
      ) {
        await KNEX(TABLES.LocalServiceProviderAndRentalUnits)
          .where({ id: isProviderAlreadyAssociated?.id })
          .update({ isActive: true });

        await KNEX(TABLES.LocalServiceProviderLogs).insert({
          name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.RE_HIRED,
          localServiceProviderId,
          message: `Re hired by rental unit - ${userRole?.rentalUnitId}`,
        });

        return res.json({
          success: true,
          message: 'Local service provider re-hired',
        });
      } else {
        await KNEX(TABLES.LocalServiceProviderAndRentalUnits).insert({
          localServiceProviderId,
          rentalUnitId: userRole?.rentalUnitId,
        });

        await KNEX(TABLES.LocalServiceProviderLogs).insert({
          name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.HIRED,
          localServiceProviderId,
          message: `hired by rental unit - ${userRole?.rentalUnitId}`,
        });

        return res.json({
          success: true,
          message: 'Local service provider hired',
        });
      }
    } catch (error) {
      console.log(
        `Error while hiring local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/fire',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.localServiceProviderFiring);

      const { localServiceProviderAndRentalUnitId, reason } = body;

      // find rental unit from user, and if not present throw error
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1);

      if (!userRole?.rentalUnitId)
        throw Error('User not associated with any rental unit');

      // check if the provider already present in that house
      const [isProviderAlreadyAssociated] = await KNEX(
        TABLES.LocalServiceProviderAndRentalUnits,
      )
        .where({
          rentalUnitId: userRole?.rentalUnitId,
          id: localServiceProviderAndRentalUnitId,
        })
        .limit(1);

      if (!isProviderAlreadyAssociated?.isActive) {
        throw Error('Local service provider not registered');
      }

      await KNEX(TABLES.LocalServiceProviderAndRentalUnits)
        .where({ id: localServiceProviderAndRentalUnitId })
        .update({
          isActive: false,
        });

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.FIRED,
        localServiceProviderId:
          isProviderAlreadyAssociated?.localServiceProviderId,
        message: `fired by rental unit - ${userRole?.rentalUnitId} | reason - ${reason}`,
      });

      return res.json({
        success: true,
        message: 'Local service provider fired',
      });
    } catch (error) {
      console.log(
        `Error while firing local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/entry',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, body }, res) => {
    try {
      const { localServiceProviderId, localServiceProviderCode } = body;

      if (!localServiceProviderId || !localServiceProviderCode)
        throw Error('Invalid payload');

      const [localServiceProvider] = await KNEX(TABLES.LocalServiceProviders)
        .where({ id: localServiceProviderId })
        .limit(1);

      if (!localServiceProvider) throw Error('Invalid local service provider');

      const [localService] = await KNEX(TABLES.LocalServices)
        .select('name')
        .where({ id: localServiceProvider.localServiceId })
        .limit(1);

      // checking if security guard and local service provider belong to same society
      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        societyId: localServiceProvider.societyId,
      });

      if (!userRole) {
        throw Error('Guard and society mis-match');
      }

      if (
        localServiceProvider?.localServiceProviderCode !==
        localServiceProviderCode
      ) {
        throw Error('Invalid local service provider code');
      }

      if (localServiceProvider?.isInside) {
        return res.json({
          success: true,
          message: 'Local service provider already inside',
        });
      }

      await KNEX(TABLES.LocalServiceProviders)
        .where({ id: localServiceProviderId })
        .update({ isInside: true });

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        localServiceProviderId,
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.ENTRY,
        message: `Entry approved by security guard with id: ${user.id}`,
      });

      sendNotificationForLocalServiceProvider({
        localServiceProviderId,
        message: `${localService.name} ${localServiceProvider.name} entered society`,
        title: 'Local Service Provider Entry',
      });

      return res.json({ success: true, message: 'Entry allowed' });
    } catch (error) {
      console.log(
        `Error while entering local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/exit',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user, body }, res) => {
    try {
      const { localServiceProviderId } = body;

      if (!localServiceProviderId) throw Error('Invalid payload');

      const [localServiceProvider] = await KNEX(
        TABLES.LocalServiceProviders,
      ).where({ id: localServiceProviderId });

      if (!localServiceProvider) throw Error('Invalid local service provider');

      const [localService] = await KNEX(TABLES.LocalServices)
        .select('name')
        .where({ id: localServiceProvider.localServiceId })
        .limit(1);

      // checking if security guard and local service provider belong to same society
      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        societyId: localServiceProvider.societyId,
      });

      if (!userRole) {
        throw Error('Guard and society mis-match');
      }

      if (localServiceProvider?.isInside === false) {
        return res.json({
          success: true,
          message: 'Local service provider already exited',
        });
      }

      await KNEX(TABLES.LocalServiceProviders)
        .where({ id: localServiceProviderId })
        .update({ isInside: false });

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        localServiceProviderId,
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.EXIT,
        message: `Exit approved by security guard with id: ${user.id}`,
      });

      sendNotificationForLocalServiceProvider({
        localServiceProviderId,
        message: `${localService.name} ${localServiceProvider.name} exited society`,
        title: 'Local Service Provider Exited',
      });

      return res.json({ success: true, message: 'Exit allowed' });
    } catch (error) {
      console.log(
        `Error while exiting local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/attendance',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.localServiceProviderAttendance);

      const { localServiceProviderId, rentalUnitId, status } = body;

      const startOfDay = moment().startOf('day');
      const endOfDay = moment().endOf('day');

      // check if user has permission for rental unit
      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        rentalUnitId,
      });

      if (!userRole)
        throw new Error('User does not belong to selected rental unit');

      // check if provider is linked to rental unit
      const [isServiceProviderEnrolled] = await KNEX(
        TABLES.LocalServiceProviderAndRentalUnits,
      ).where({ rentalUnitId, localServiceProviderId });

      if (!isServiceProviderEnrolled)
        throw Error('Provider is not linked to rental unit');

      // check if attendance already marked for the day
      const [isAttendanceMarked] = await KNEX(
        TABLES.LocalServiceProviderAttendance,
      )
        .whereBetween('createdAt', [startOfDay, endOfDay])
        .where({ rentalUnitId, localServiceProviderId });

      if (isAttendanceMarked) {
        return res.json({
          success: true,
          message: 'Attendance already marked for the day',
        });
      }

      // if no attendance is marked, insert to table and also the logs table
      await KNEX(TABLES.LocalServiceProviderAttendance).insert({
        localServiceProviderId,
        rentalUnitId,
        userId: user.id,
        status,
      });

      await KNEX(TABLES.LocalServiceProviderLogs).insert({
        localServiceProviderId,
        name: LOCAL_SERVICE_PROVIDER_LOG_CATEGORIES.ATTENDANCE,
        message: `Attendance marked by userId - ${user.id} | status - ${status}`,
      });

      return res.json({ success: true, message: 'Attendance marked' });
    } catch (error) {
      console.log(
        `Error while marking attendance for local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/rating',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.localServiceProviderRating);

      const { localServiceProviderId, rentalUnitId, ratings } = body;

      const [userRole] = await KNEX(TABLES.UserRoles).where({
        userId: user.id,
        rentalUnitId,
      });

      if (!userRole)
        throw new Error('User does not belong to selected rental unit');

      // check if ratings has keys from constants and values are numeric between 1-5
      for (const key of Object.keys(ratings)) {
        if (
          ![...Object.keys(LOCAL_SERVICE_PROVIDER_RATING_CATEGORIES)].includes(
            key,
          )
        ) {
          throw new Error('Invalid rating category');
        }

        if (
          typeof ratings[key] !== 'number' ||
          ratings[key] < 1 ||
          ratings[key] > 5
        ) {
          throw new Error('Invalid rating');
        }
      }

      // check if rating already exists, if not then insert else update
      for (const category of Object.keys(ratings)) {
        const [rating] = await KNEX(TABLES.LocalServiceProviderRatings)
          .where({
            localServiceProviderId,
            rentalUnitId,
            category,
          })
          .limit(1);

        if (!rating) {
          await KNEX(TABLES.LocalServiceProviderRatings).insert({
            localServiceProviderId,
            rentalUnitId,
            category,
            rating: ratings[category],
          });
        } else {
          await KNEX(TABLES.LocalServiceProviderRatings)
            .where({
              id: rating.id,
            })
            .update({ rating: ratings[category] });
        }
      }

      return res.json({
        success: true,
        message: 'Ratings updated successfully',
      });
    } catch (error) {
      console.log(
        `Error while rating local service provider: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/attendance/:id',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, params }, res) => {
    try {
      requestValidator(params, validationSchemas.fetchAttendance);

      const { id: localServiceProviderId } = params;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1);

      if (!userRole?.rentalUnitId)
        throw Error('User not associated with any rental unit');

      const attendance = await KNEX(TABLES.LocalServiceProviderAttendance)
        .where({
          localServiceProviderId,
          rentalUnitId: userRole.rentalUnitId,
        })
        .orderBy('createdAt')
        .select('createdAt', 'status');

      return res.json({ success: true, data: attendance });
    } catch (error) {
      console.log(
        `Error while fetching service provider attendance: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// fetches details for a specific service provider
router.get('/:id', async ({ params }, res) => {
  try {
    const { id } = params;

    if (!id) throw new Error('Invalid local service provider id');

    const localServiceProviderPromise = KNEX(TABLES.LocalServiceProviders)
      .select([
        `${TABLES.LocalServiceProviders}.id as id`,
        `${TABLES.LocalServiceProviders}.name as name`,
        `${TABLES.LocalServiceProviders}.mobileNumber as mobileNumber`,
        `${TABLES.LocalServiceProviders}.image as image`,
        `${TABLES.LocalServiceProviders}.localServiceProviderCode as localServiceProviderCode`,
        `${TABLES.LocalServices}.name as category`,
      ])
      .innerJoin(
        TABLES.LocalServices,
        `${TABLES.LocalServiceProviders}.localServiceId`,
        `${TABLES.LocalServices}.id`,
      )
      .where({ [`${TABLES.LocalServiceProviders}.id`]: id })
      .limit(1);

    const householdsPromise = KNEX(TABLES.LocalServiceProviderAndRentalUnits)
      .where({ localServiceProviderId: id, isActive: true })
      .select([
        `${TABLES.LocalServiceProviderAndRentalUnits}.id as localServiceProviderAndRentalUnitId`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
      ])
      .innerJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.LocalServiceProviderAndRentalUnits}.rentalUnitId`,
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

    const ratingQueryPromises = [];
    for (let category of Object.keys(
      LOCAL_SERVICE_PROVIDER_RATING_CATEGORIES,
    )) {
      const ratingPromise = KNEX(TABLES.LocalServiceProviderRatings)
        .where({
          localServiceProviderId: id,
          category,
        })
        .avg('rating');

      ratingQueryPromises.push(ratingPromise);
    }

    const [[localServiceProvider], households, ...ratings] = await Promise.all([
      localServiceProviderPromise,
      householdsPromise,
      ...ratingQueryPromises,
    ]);

    const ratingsObject = {};

    for (let index in ratings) {
      const category = Object.keys(LOCAL_SERVICE_PROVIDER_RATING_CATEGORIES)[
        index
      ];
      const averageRating = Number(ratings?.[index]?.[0]?.avg) || 0;
      ratingsObject[category] = averageRating;
    }

    const data = {
      ...localServiceProvider,
      households,
      ratingsObject,
    };

    ratingsObject['AVERAGE'] = calculateAverage(Object.values(ratingsObject));

    return res.json({ success: true, data });
  } catch (error) {
    console.log(
      `Error while fetching service provider details: ${error.message}`,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

export default router;
