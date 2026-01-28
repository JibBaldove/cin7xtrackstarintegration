 function handler(params) {                                                                                                  
    const inventoryAdjustment = params.data.var.inventoryAdjustment;                                                          
    const locationList = params.data.steps.getLocations.output.LocationList;                                                  
                                                                                                                              
    // Validate inventory adjustment exists                                                                                   
    if (!inventoryAdjustment || !inventoryAdjustment.Lines || inventoryAdjustment.Lines.length === 0) {                       
      return { error: 'No inventory adjustment lines found' };                                                                
    }                                                                                                                         
                                                                                                                              
    // Find the matching location by name                                                                                     
    const locationName = inventoryAdjustment.locationName;                                                                    
    const matchingLocation = locationList.find((loc) => loc.Name === locationName);                                           
                                                                                                                              
    if (!matchingLocation) {                                                                                                  
      return { error: `Location ${locationName} not found in LocationList` };                                                 
    }                                                                                                                         
                                                                                                                              
    // Extract lines and enrich with only valid API fields for stock adjustment
    const enrichedLines = inventoryAdjustment.Lines.map((line) => ({
      LocationId: matchingLocation.ID,
      SKU: line.SKU,
      Quantity: line.Quantity,
      UnitCost: line.UnitCost,
      ...(inventoryAdjustment.lot_id ? { BatchSN: inventoryAdjustment.lot_id } : {}),
      ...(inventoryAdjustment.expiration_date ? { ExpiryDate: inventoryAdjustment.expiration_date } : {})
    }));                                                                                                                      
                                                                                                                              
    return enrichedLines;                                                                                                     
  }   