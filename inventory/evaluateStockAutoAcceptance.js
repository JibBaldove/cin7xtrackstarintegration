function handler(params) {
  const autoAcceptThreshold = params.data.steps.extractTenantConfig.output.autoAcceptThreshold;

  const inventoryAdjustment = params.data.var.inventoryAdjustment;
  const productAvailabilityList = params.data.steps.getProductAvailability.output.ProductAvailability;

  // Handle both boolean and string values
  const finalShouldAutoApprove = params.data.var.finalShouldAutoApprove === true;

  if (!inventoryAdjustment || !inventoryAdjustment.Lines || inventoryAdjustment.Lines.length === 0) {
    return {
      success: false,
      shouldAutoApprove: false,
      adjustmentNeeded: false,
      message: 'No inventory adjustment data found',
    };
  }

  const warehouse = inventoryAdjustment.locationName;

  // Check if ProductAvailability is empty or undefined
  const hasProductAvailability = productAvailabilityList && Array.isArray(productAvailabilityList) && productAvailabilityList.length > 0;

  // If no product availability data, proceed with adjustment and auto-approve
  if (!hasProductAvailability) {
    // Check if all quantities are zero - if so, no adjustment needed
    const hasNonZeroQuantity = inventoryAdjustment.Lines.some(line => line.Quantity !== 0);

    if (!hasNonZeroQuantity) {
      return {
        success: true,
        shouldAutoApprove: false,
        adjustmentNeeded: false,
        message: 'No product availability data found and all quantities are zero - no adjustment needed',
        inventoryAdjustment: inventoryAdjustment
      };
    }

    if (inventoryAdjustment.lot_id) {
        inventoryAdjustment.Lines.forEach((line) => {
          line.BatchSN = inventoryAdjustment.lot_id;
          line.ExpiryDate = inventoryAdjustment.expiration_date;
        });
    }
    return {
      success: true,
      shouldAutoApprove: true,
      adjustmentNeeded: true,
      message: 'No product availability data found - proceeding with adjustment with auto-approval',
      inventoryAdjustment: inventoryAdjustment
    };
  }

  let allLinesValid = true;
  let overallShouldAutoApprove = finalShouldAutoApprove;
  let adjustmentNeeded = false;

  // Process each line
  inventoryAdjustment.Lines.forEach((line) => {
    const sku = line.SKU;
    const trackstarQuantity = line.Quantity;

    // Find product availability with exact SKU and Location match
    const productAvailabilityOnWarehouse = productAvailabilityList.find(
      (item) => item.SKU === sku && item.Location === warehouse
    );

    // If product not found in availability list, treat as valid and auto-approve
    if (!productAvailabilityOnWarehouse) {
      allLinesValid = false;
      adjustmentNeeded = true;
      // Don't change overallShouldAutoApprove - treat missing products as auto-approvable
    } else {
      // Check if quantities differ - adjustment needed
      if (trackstarQuantity !== productAvailabilityOnWarehouse.OnHand) {
        adjustmentNeeded = true;
      }

      // If threshold is 0, always auto-approve
      // Otherwise, check if difference is within threshold
      const lineAutoApprove = autoAcceptThreshold === 0 ||
        Math.abs(trackstarQuantity - productAvailabilityOnWarehouse.OnHand) <= autoAcceptThreshold;

      // If any line doesn't meet threshold, overall should be false
      if (!lineAutoApprove) {
        overallShouldAutoApprove = false;
      }
    }
  });

  // Add BatchSN to lines if lot_id exists
  if (inventoryAdjustment.lot_id) {
    inventoryAdjustment.Lines.forEach((line) => {
      line.BatchSN = inventoryAdjustment.lot_id;
      line.ExpiryDate = inventoryAdjustment.expiration_date;
    });
  }

  // Proceed with the adjustment
  // If some products were not found, they're treated as auto-approvable
  if (!allLinesValid) {
    return {
      success: true,
      shouldAutoApprove: overallShouldAutoApprove,
      adjustmentNeeded: true,
      message: 'One or more products were not found in the Product availability list - those items are auto-approved',
      inventoryAdjustment: inventoryAdjustment
    };
  }

  return {
    success: true,
    shouldAutoApprove: overallShouldAutoApprove,
    adjustmentNeeded: adjustmentNeeded,
    inventoryAdjustment: inventoryAdjustment
  };
}
