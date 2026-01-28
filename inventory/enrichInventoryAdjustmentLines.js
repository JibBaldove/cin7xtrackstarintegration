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
                                                                                                                              
    // Extract lines and enrich with LocationId and LocationName                                                              
    const enrichedLines = inventoryAdjustment.Lines.map((line) => ({                                                          
      LocationId: matchingLocation.ID,                                                                                        
      LocationName: matchingLocation.Name,                                                                                    
      SKU: line.SKU,                                                                                                          
      ProductName: line.ProductName,                                                                                          
      Quantity: line.Quantity,                                                                                                
      UnitCost: line.UnitCost,                                                                                                
      ProductLength: line.ProductLength,                                                                                      
      ProductWidth: line.ProductWidth,                                                                                        
      ProductHeight: line.ProductHeight,                                                                                      
      ProductWeight: line.ProductWeight,                                                                                      
      ...(line.BatchSN ? { BatchSN: line.BatchSN } : {}),                                                                     
      ...(line.ExpiryDate ? { ExpiryDate: line.ExpiryDate } : {})                                                             
    }));                                                                                                                      
                                                                                                                              
    return enrichedLines;                                                                                                     
  }   