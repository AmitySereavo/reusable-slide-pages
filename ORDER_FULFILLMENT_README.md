# Order Fulfillment And Shipment Tracking

This document defines the reusable order fulfillment and shipment tracking
system that should be built across Reusable Slides stores.

The system tracks every physical order from placement through customer receipt
confirmation. It should be visible to administrators, fulfillment staff,
couriers where applicable, purchasers, and recipients when different from the
purchaser.

Fulfillment workflows must be generated dynamically from configuration rather
than hardcoded status lists.

Workflow generation should consider:

- product type
- shipping type
- destination country
- destination parish/state
- selected courier
- government certification requirements
- customs requirements
- delivery method
- store-level fulfillment configuration

## Customer Visibility

The customer should always know:

- what is happening now
- what has already happened
- what happens next
- who currently has possession of the package
- whether action is required from them

Each completed step should be able to display:

- completion timestamp
- staff member or automated system that completed it
- optional notes
- optional photos or documents
- estimated next step

Customer-facing views should show completed, current, and upcoming milestones in
a simplified timeline. Admin and fulfillment views should show the full history.

## Universal Workflow

Every physical shipment begins with these baseline steps.

### Order Request Sent To Fulfillment

The order has been received and sent to the fulfillment team.

This step is completed automatically after payment.

### Items Selected, Packaged And Labeled

The requested items have been selected, packaged, and labeled for shipment.

This step is completed by fulfillment staff and may include:

- packaging photos
- packing checklist
- weight
- dimensions

### Courier Requested

A courier has been contacted and the package is being prepared for handoff.

This step may include:

- courier information
- tracking number
- estimated pickup

## Local Delivery Workflow

If shipping type is local delivery, the workflow should continue with local
delivery milestones.

Examples:

- Courier Has Collected Your Package
- Out For Delivery
- Delivered
- Customer Confirmation

Delivery confirmation may include:

- delivery confirmation record
- optional delivery photo
- optional signature
- optional GPS location

The recipient should be able to confirm delivery, upload photos of received
items, leave comments, and report damage or other issues.

Customer confirmation may trigger configured rewards such as:

- discount coupon
- loyalty points
- store credit
- promotional offer

## International Shipping Workflow

If shipping type is international, the workflow should continue with export,
customs, and destination-country milestones.

Examples:

- Courier Has Collected Your Package
- Preparing Export Documentation
- Export Documentation Approved
- Package Arrived At Export Port
- Package Cleared Export Processing
- Shipment Has Left Country Of Origin
- Shipment In Transit
- Shipment Arrived In Destination Country
- Awaiting Customs Clearance
- Customs Cleared
- Transferred To Local Courier
- Out For Delivery
- Delivered
- Customer Confirmation

Export and customs steps should only appear when applicable. Required documents
must be determined dynamically from product metadata and destination rules.

Possible documents include:

- government certificate
- phytosanitary certificate
- export permit
- commercial invoice
- certificate of origin
- health certificate
- other configured export documentation

## Product-Based Dynamic Steps

Certain products may insert additional fulfillment steps.

Examples:

- plants
- seeds
- fresh produce
- herbal products
- dried leaves
- food
- live products
- government-regulated products

Product metadata may require steps such as:

- government inspection
- laboratory inspection
- phytosanitary certificate
- export permit
- health certificate
- cold-chain preparation
- temperature-controlled packaging
- hazardous goods declaration

These requirements must be configurable and reusable across stores.

## Courier Selection

During checkout, before payment is completed, purchasers should choose their
preferred delivery method for physical orders.

Available delivery options must come from store configuration and destination
rules, not hardcoded lists.

Courier selection should consider:

- destination country
- destination parish/state
- product restrictions
- shipping method
- store configuration

Examples of configured options:

- Company Delivery
- DHL
- FedEx
- UPS
- Jamaica Post
- Knutsford Express
- Zipmail
- In-store Pickup
- other configured couriers

The selected courier should be saved with the order and shown throughout the
order lifecycle.

## Orders Dashboard

The Orders dashboard should display:

- selected courier
- tracking number
- courier contact information when available
- shipping method
- current fulfillment stage
- estimated delivery date
- estimated remaining time
- full fulfillment activity history

Administrators should be able to:

- mark steps complete
- skip steps when appropriate
- insert additional steps
- reorder steps
- upload documents
- upload photos
- add notes
- correct mistakes
- assign staff members
- assign courier
- generate shipping labels
- generate export paperwork
- record timestamps automatically

## Manual Confirmation

Manual in-house fulfillment milestones must not use ordinary buttons,
dropdowns, or single-click completion controls.

Manual confirmation should use a press-and-drag slider similar to banking app
confirmation controls.

Interaction:

1. Staff presses and holds the slider.
2. Staff drags the slider completely across.
3. The step is marked complete only after the slider reaches the end.

Manual stages may include:

- Items Selected
- Items Packaged
- Items Labeled
- Package Ready For Pickup
- Courier Contacted
- Awaiting Courier Pickup
- Package Handed To Courier
- Government Documents Prepared
- Export Documents Submitted
- other in-house milestones configured by the store

After confirmation, the system should record:

- completion timestamp
- staff member
- optional notes
- optional uploaded photos
- optional uploaded documents

The order may automatically advance to the next configured step.

## Automatic Updates

Some fulfillment stages should update automatically and require no manual
confirmation.

Examples:

- barcode scanned at packing station
- QR code scanned during dispatch
- courier scans package at pickup
- courier scans package at sorting facility
- courier scans package during transit
- courier scans package upon delivery
- customs integration updates
- carrier tracking API updates

Automatic updates should record:

- timestamp
- source system
- raw event metadata where useful

Example sources:

- Courier API
- Barcode Scanner
- QR Scanner
- Warehouse Scanner
- Customs Integration

Customer-facing views should indicate whether a milestone was updated manually
by staff or automatically by the logistics system.

## Activity History

Every fulfillment update should be stored in an activity log.

Each log entry should include:

- fulfillment stage
- timestamp
- update type, manual or automatic
- staff member or automated system
- optional notes
- optional uploaded images
- optional uploaded documents

Administrators should see the complete fulfillment history for every order.
Customers should see a simplified milestone history with major timestamps.

## Notifications

Customers should receive notifications when major milestones occur.

Examples:

- order received
- package packed
- courier assigned
- package collected
- shipment departed
- shipment arrived in destination country
- customs cleared
- out for delivery
- delivered
- confirmation requested

Notification methods should support:

- email
- SMS when configured
- WhatsApp when configured
- push notifications when configured

## Reusability

The fulfillment system must be reusable across stores built on the platform.

Individual stores should configure:

- fulfillment workflows
- product requirements
- shipping methods
- required certifications
- notification preferences
- reward program

The system should assemble the correct fulfillment workflow from configuration
instead of relying on hardcoded order states.
