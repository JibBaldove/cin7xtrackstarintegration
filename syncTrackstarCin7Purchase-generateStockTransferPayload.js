function handler(params) {
    let cin7Id = params.data?.var?.cin7Id || "";
    const lineItems = params.data?.input.data.line_items || [];
    const updatedDate = params.data?.input.data.updated_date || null;

    // Remove ":TO" suffix if it exists (case-insensitive, trim whitespace)
    cin7Id = cin7Id.trim();
    if (cin7Id.toUpperCase().endsWith(":TO")) {
        cin7Id = cin7Id.slice(0, -3);
    }

    // If there are no line items, return false
    if (lineItems.length === 0) {
        return { result: false };
    }

    // Check if all items have zero received quantity (no receipts)
    const allZeroReceived = lineItems.every(item => {
        const received = item.received_quantity || 0;
        return received === 0;
    });

    // If no receipts (all received quantities are 0), return false
    if (allZeroReceived) {
        return { result: false };
    }

    // Check if all line items have matching expected_quantity and received_quantity
    const allFullyMatched = lineItems.every(item => {
        const expected = item.expected_quantity || 0;
        const received = item.received_quantity || 0;
        return expected === received;
    });

    // Check if all items have received quantity > 0
    const allHaveReceipts = lineItems.every(item => {
        const received = item.received_quantity || 0;
        return received > 0;
    });

    // If all items have receipts (either fully or partially), mark as COMPLETED
    if (allHaveReceipts) {
        const overallStatus = allFullyMatched ? "Fully Completed" : "Partially Completed";

        // Generate item-by-item details for comments
        const itemDetails = lineItems.map(item => {
            const sku = item.sku || "N/A";
            const expected = item.expected_quantity || 0;
            const received = item.received_quantity || 0;
            return `  SKU: ${sku} - Expected: ${expected}, Received: ${received}`;
        }).join('\n');

        const comments = `Transfer Sync Status: ${overallStatus}\n\nItem Details:\n${itemDetails}`;

        return {
            TaskID: cin7Id,
            Status: "COMPLETED",
            CompletionDate: updatedDate || new Date().toISOString(),
            Comments: comments
        };
    }

    // If some items have 0 received (mixed partial receipt), return false
    return { result: false };
}