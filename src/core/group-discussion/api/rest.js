import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import { sendNotificationToSocietyResidents } from '../../../utils/helpers.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.createDiscussion);

      const { content, fileUrl, title } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          role: USER_ROLES.RESIDENT,
          userId: user.id,
        })
        .limit(1);

      if (!userRole?.societyId || !userRole?.rentalUnitId)
        throw new Error('User not associated with rental unit');

      await KNEX(TABLES.GroupDiscussion).insert({
        userId: user.id,
        societyId: userRole.societyId,
        content,
        fileUrl,
        title,
      });

      await sendNotificationToSocietyResidents({
        societyId: userRole?.societyId,
        title: 'New Discussion',
        message: `${title} by ${user.firstName}`,
      });

      return res
        .status(201)
        .json({ success: true, message: 'Discussion created' });
    } catch (error) {
      console.log(`Error while creating chat: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/comment',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.createComment);

      const { comment, groupDiscussionId, photoUrl, attachmentUrl } = body;

      const [groupDiscussion] = await KNEX(TABLES.GroupDiscussion)
        .where({ id: groupDiscussionId })
        .limit(1);

      if (!groupDiscussion) throw new Error('Invalid group discussion');

      await KNEX(TABLES.GroupDiscussionComments).insert({
        userId: user.id,
        groupDiscussionId,
        comment,
        photoUrl,
        attachmentUrl,
      });

      await sendNotificationToSocietyResidents({
        societyId: groupDiscussion?.societyId,
        title: 'Activity on Discussion',
        message: `Replied by ${user.firstName} on ${groupDiscussion.title}`,
      });

      return res.json({ success: true, message: 'comment created' });
    } catch (error) {
      console.log(`Error while creating comment: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// fetches list of discussions
router.get('/', checkRole([USER_ROLES.RESIDENT]), async ({ user }, res) => {
  try {
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        role: USER_ROLES.RESIDENT,
        userId: user.id,
      })
      .limit(1);

    if (!userRole?.societyId || !userRole?.rentalUnitId)
      throw new Error('User not associated with rental unit');

    const discussions = await KNEX(TABLES.GroupDiscussion)
      .innerJoin(
        TABLES.Users,
        `${TABLES.Users}.id`,
        `${TABLES.GroupDiscussion}.userId`,
      )
      .select([
        `${TABLES.GroupDiscussion}.id`,
        `${TABLES.GroupDiscussion}.createdAt`,
        `${TABLES.GroupDiscussion}.content`,
        `${TABLES.GroupDiscussion}.fileUrl`,
        `${TABLES.GroupDiscussion}.title`,
        `${TABLES.GroupDiscussion}.userId`,

        `${TABLES.Users}.mobileNumber`,
        `${TABLES.Users}.firstName`,
        `${TABLES.Users}.lastName`,
        `${TABLES.Users}.profileImage`,
      ])
      .where({ societyId: userRole.societyId })
      .orderBy(`${TABLES.GroupDiscussion}.createdAt`, 'desc');

    for (let index = 0; index < discussions.length; index++) {
      const discussion = discussions[index];

      // fetching rental unit information
      const [rentalUnitData] = await KNEX(TABLES.RentalUnits)
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

      discussion['rentalUnitData'] = rentalUnitData;

      // fetching associated comments

      const comments = await KNEX(TABLES.GroupDiscussionComments)
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.GroupDiscussionComments}.userId`,
        )
        .select([
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.Users}.firstName`,
          `${TABLES.Users}.lastName`,
          `${TABLES.Users}.profileImage`,
          `${TABLES.Users}.id as userId`,

          `${TABLES.GroupDiscussionComments}.comment`,
          `${TABLES.GroupDiscussionComments}.createdAt`,
          `${TABLES.GroupDiscussionComments}.photoUrl`,
          `${TABLES.GroupDiscussionComments}.attachmentUrl`,
        ])
        .where({ groupDiscussionId: discussion.id })
        .orderBy(`${TABLES.GroupDiscussionComments}.createdAt`);

      discussion['comments'] = comments;
    }

    return res.json({ success: true, data: discussions });
  } catch (error) {
    console.log(`Error while fetching chat: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

export default router;
