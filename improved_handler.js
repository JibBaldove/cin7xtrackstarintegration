/**
 * Generates reference ID and key for order tracking
 * For Advance Sales, appends fulfillment-specific identifiers
 *
 * @param {Object} params - Handler parameters containing step outputs
 * @param {Object} params.data - Data object containing step outputs and variables
 * @returns {Object} Object containing referenceId and referenceKey
 */
function handler(params) {
  // Constants
  const SALE_TYPE_ADVANCE = 'Advance Sale';

  // Use optional chaining and nullish coalescing for safe property access
  const saleDetails = params.data?.steps?.getCin7SaleDetails?.output;
  const saleOrderType = params.data?.steps?.var?.saleOrderType;
  const loopItem = params.data?.steps?.loopOverOrderFulfillments?.loopOverItem;

  // Validate required data
  if (!saleDetails?.ID || !saleDetails?.Order?.SaleOrderNumber) {
    throw new Error('Missing required sale details: ID or SaleOrderNumber');
  }

  // Extract base values
  let referenceId = saleDetails.ID;
  let referenceKey = saleDetails.Order.SaleOrderNumber;

  // Append fulfillment identifiers for Advance Sales
  if (saleOrderType === SALE_TYPE_ADVANCE) {
    // Validate fulfillment data exists for Advance Sales
    if (!loopItem?.TaskID || !loopItem?.FulfillmentNumber) {
      console.warn('Advance Sale detected but fulfillment data is missing');
    } else {
      // Use template literals for cleaner string concatenation
      referenceId = `${referenceId}:${loopItem.TaskID}`;
      referenceKey = `${referenceKey}-${loopItem.FulfillmentNumber}`;
    }
  }

  // Return using shorthand property names
  return { referenceId, referenceKey };
}

// ============================================================================
// ALTERNATIVE: More defensive version with detailed error handling
// ============================================================================

/**
 * Generates reference ID and key for order tracking (defensive version)
 *
 * @param {Object} params - Handler parameters
 * @returns {Object} Object containing referenceId and referenceKey
 * @throws {Error} If required data is missing
 */
function handlerDefensive(params) {
  const SALE_TYPE_ADVANCE = 'Advance Sale';

  // Destructure with defaults to avoid nested optional chaining
  const {
    data: {
      steps: {
        getCin7SaleDetails: { output: saleDetails = {} } = {},
        var: { saleOrderType } = {},
        loopOverOrderFulfillments: { loopOverItem = {} } = {}
      } = {}
    } = {}
  } = params || {};

  // Validate required fields
  const { ID: saleId, Order: { SaleOrderNumber: orderNumber } = {} } = saleDetails;

  if (!saleId || !orderNumber) {
    throw new Error(
      'Missing required sale details. ' +
      `ID: ${saleId ?? 'undefined'}, ` +
      `SaleOrderNumber: ${orderNumber ?? 'undefined'}`
    );
  }

  // Build references
  const isAdvanceSale = saleOrderType === SALE_TYPE_ADVANCE;
  const { TaskID: taskId, FulfillmentNumber: fulfillmentNumber } = loopItem;

  const referenceId = isAdvanceSale && taskId
    ? `${saleId}:${taskId}`
    : saleId;

  const referenceKey = isAdvanceSale && fulfillmentNumber
    ? `${orderNumber}-${fulfillmentNumber}`
    : orderNumber;

  return { referenceId, referenceKey };
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

// Example with standard sale
const standardSaleParams = {
  data: {
    steps: {
      getCin7SaleDetails: {
        output: {
          ID: '12345',
          Order: {
            SaleOrderNumber: 'SO-2024-001'
          }
        }
      },
      var: {
        saleOrderType: 'Standard Sale'
      }
    }
  }
};

// Example with advance sale
const advanceSaleParams = {
  data: {
    steps: {
      getCin7SaleDetails: {
        output: {
          ID: '12345',
          Order: {
            SaleOrderNumber: 'SO-2024-001'
          }
        }
      },
      var: {
        saleOrderType: 'Advance Sale'
      },
      loopOverOrderFulfillments: {
        loopOverItem: {
          TaskID: 'TASK-456',
          FulfillmentNumber: '001'
        }
      }
    }
  }
};

// Test
console.log('Standard Sale:', handler(standardSaleParams));
// Output: { referenceId: '12345', referenceKey: 'SO-2024-001' }

console.log('Advance Sale:', handler(advanceSaleParams));
// Output: { referenceId: '12345:TASK-456', referenceKey: 'SO-2024-001-001' }

module.exports = { handler, handlerDefensive };
