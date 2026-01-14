function handler(params) {
    // Access the step results
    const createPickResult = params?.data?.steps?.createShipmentFulfillmentPick;
    const createPackResult = params?.data?.steps?.createShipmentFulfillmentPack;
    const createShipmentResult = params?.data?.steps?.createShipmentFulfillmentShip;

    // Check if all operations are undefined
    const allUndefined = !createPickResult && !createPackResult && !createShipmentResult;

    if (allUndefined) {
      return {
        syncStatus: "Success",
        message: "No changes needed to be synced"
      };
    }

    // Helper function to check if a result indicates "already authorised"
    function isAlreadyAuthorised(result) {
      if (!result || result.statusCode === 200) return false;

      // Check if the message contains the "already authorised" exception
      const message = result.output?.message || "";

      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const exception = parsed[0].Exception || "";
          return exception.includes("Status is AUTHORISED");
        }
      } catch (e) {
        // If parsing fails, check the raw string
        return message.includes("Status is AUTHORISED");
      }

      return false;
    }

    // Check if operations succeeded or are already authorised
    const pickSuccess = !createPickResult || createPickResult?.statusCode === 200 || isAlreadyAuthorised(createPickResult);
    const packSuccess = !createPackResult || createPackResult?.statusCode === 200 || isAlreadyAuthorised(createPackResult);
    const shipSuccess = !createShipmentResult || createShipmentResult?.statusCode === 200 || isAlreadyAuthorised(createShipmentResult);
    const allSuccess = pickSuccess && packSuccess && shipSuccess;

    // Determine syncStatus
    const syncStatus = allSuccess ? "Success" : "Failed";

    // Build message
    let message;
    if (allSuccess) {
      // Check if operations were already authorised
      const pickAlreadyAuth = isAlreadyAuthorised(createPickResult);
      const packAlreadyAuth = isAlreadyAuthorised(createPackResult);
      const shipAlreadyAuth = isAlreadyAuthorised(createShipmentResult);

      const allAlreadyAuth = (pickAlreadyAuth || !createPickResult) &&
                             (packAlreadyAuth || !createPackResult) &&
                             (shipAlreadyAuth || !createShipmentResult);
      const someAlreadyAuth = pickAlreadyAuth || packAlreadyAuth || shipAlreadyAuth;

      if (allAlreadyAuth && someAlreadyAuth) {
        message = "Pick, Pack and Shipment is already existing.";
      } else if (someAlreadyAuth) {
        message = "Successfully sync updates from Trackstar (where some operations were already existing).";
      } else {
        message = "Successfully sync updates from Trackstar";
      }
    } else {
      // Collect error messages from failed operations
      const errorMessages = [];

      if (!pickSuccess) {
        if (!createPickResult) {
          errorMessages.push("Pick operation not found or did not execute");
        } else {
          // Try to extract the actual error message
          const pickMessage = createPickResult.output?.message || "";
          try {
            const parsed = JSON.parse(pickMessage);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Exception) {
              errorMessages.push(`Pick failed: ${parsed[0].Exception}`);
            } else {
              errorMessages.push(`Pick failed with status: ${createPickResult.statusCode}`);
            }
          } catch (e) {
            errorMessages.push(`Pick failed: ${pickMessage || createPickResult.statusCode}`);
          }
        }
      }

      if (!packSuccess) {
        if (!createPackResult) {
          errorMessages.push("Pack operation not found or did not execute");
        } else {
          // Try to extract the actual error message
          const packMessage = createPackResult.output?.message || "";
          try {
            const parsed = JSON.parse(packMessage);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Exception) {
              errorMessages.push(`Pack failed: ${parsed[0].Exception}`);
            } else {
              errorMessages.push(`Pack failed with status: ${createPackResult.statusCode}`);
            }
          } catch (e) {
            errorMessages.push(`Pack failed: ${packMessage || createPackResult.statusCode}`);
          }
        }
      }

      if (!shipSuccess) {
        if (!createShipmentResult) {
          errorMessages.push("Ship operation not found or did not execute");
        } else {
          // Try to extract the actual error message
          const shipMessage = createShipmentResult.output?.message || "";
          try {
            const parsed = JSON.parse(shipMessage);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Exception) {
              errorMessages.push(`Ship failed: ${parsed[0].Exception}`);
            } else {
              errorMessages.push(`Ship failed with status: ${createShipmentResult.statusCode}`);
            }
          } catch (e) {
            errorMessages.push(`Ship failed: ${shipMessage || createShipmentResult.statusCode}`);
          }
        }
      }

      message = errorMessages.length > 0
        ? errorMessages.join("; ")
        : "Failed to sync updates from Trackstar";
    }

    // Extract cin7Id (TaskID) from any of the results
    let cin7Id = null;
    if (createPickResult?.output?.TaskID) {
      cin7Id = createPickResult.output.TaskID;
    } else if (createPackResult?.output?.TaskID) {
      cin7Id = createPackResult.output.TaskID;
    } else if (createShipmentResult?.output?.TaskID) {
      cin7Id = createShipmentResult.output.TaskID;
    }

    // Extract cin7Key: last 5 digits of TaskID prepended to params.data.var.cin7Key
    let cin7Key = params.data?.var?.cin7Key || "";
    if (cin7Id) {
      const last5Digits = cin7Id.toString().slice(-5);
      cin7Key = `${last5Digits}:${cin7Key}`;
    }

    // Get parentReferenceKey from params.data.var.referenceKey
    const parentReferenceKey = params.data?.var?.referenceKey || "";

    return {
      syncStatus,
      message,
      cin7Id,
      cin7Key,
      parentReferenceKey
    };
  }