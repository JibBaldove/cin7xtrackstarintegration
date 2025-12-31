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

  // If no product availability data, proceed with adjustment but don't auto-approve
  if (!hasProductAvailability) {
    return {
      success: true,
      shouldAutoApprove: false,
      adjustmentNeeded: true,
      message: 'No product availability data found - proceeding with adjustment without auto-approval',
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

    // If product not found, mark as invalid but continue processing
    if (!productAvailabilityOnWarehouse) {
      allLinesValid = false;
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

  // Even if some products are not found, proceed with the adjustment
  if (!allLinesValid) {
    return {
      success: true,
      shouldAutoApprove: false,
      adjustmentNeeded: true,
      message: 'One or more products were not found in the Product availability list - proceeding without auto-approval',
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
