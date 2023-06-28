import { KNEX, TABLES } from '../../../services/knex.js';
import { sendNotificationToRentalUnit } from '../../../utils/helpers.js';

const sendNotificationForLocalServiceProvider = async ({
  localServiceProviderId,
  message,
  title,
}) => {
  const localServiceProviderAndRentalUnits = await KNEX(
    TABLES.LocalServiceProviderAndRentalUnits,
  )
    .where({
      localServiceProviderId,
    })
    .select('rentalUnitId');

  for (
    let index = 0;
    index < localServiceProviderAndRentalUnits.length;
    index++
  ) {
    const { rentalUnitId } = localServiceProviderAndRentalUnits[index];

    if (rentalUnitId) {
      await sendNotificationToRentalUnit({ rentalUnitId, message, title });
    }
  }
};

export { sendNotificationForLocalServiceProvider };
