# Offers

Use this file to define approved offers. Offers must be based on real owner-approved product facts.

## Offer Template

```yaml
offer_id: ""
product_id: ""
name: ""
description: ""
included: []
not_included: []
price: ""
valid_until: ""
cta: ""
booking_or_purchase_link: ""
allowed_claims: []
prohibited_claims: []
status: "draft"
approved_by_owner: false
```

## Offer Entry: Nord Smart Menu Starter

```yaml
offer_id: "nord-smart-menu-starter"
product_id: "nord-smart-menu"
name: "Nord Smart Menu Starter"
description: "Starter offer for restaurants that want a hosted QR menu and restaurant order flow with guest menu, admin panel, and kitchen view."
included:
  - "Guest QR menu"
  - "Admin panel"
  - "Kitchen view"
  - "Menu content, price, image, and publishing management"
  - "Protected staff areas"
  - "Hosting included"
not_included:
  - "Guaranteed sales increase"
  - "Guaranteed more bookings"
  - "Official certification"
price: "First month free, 119 SEK/month, 1500 SEK one-time fee, hosting included."
valid_until: ""
cta: "View demo or book a short walkthrough"
booking_or_purchase_link: "https://www.smartartai.se/nord-smart-menu"
allowed_claims:
  - "Guests can scan a QR code and order directly from mobile."
  - "Restaurant staff can manage menu content, prices, images, and publishing."
  - "Kitchen staff can see new and ongoing orders in a readable view."
  - "Hosting is included in the monthly price."
prohibited_claims:
  - "Guaranteed sales increase."
  - "Guaranteed more bookings."
  - "Official certification."
  - "Your current website or menu is bad."
status: "draft"
approved_by_owner: false
last_updated: "2026-04-29"
```

## Offer Entry: Nord Smart Menu Pro

```yaml
offer_id: "nord-smart-menu-pro"
product_id: "nord-smart-menu"
name: "Nord Smart Menu Pro"
description: "Pro offer for restaurants that want a hosted QR menu system with guest ordering, admin control, and kitchen order handling."
included:
  - "Guest QR menu"
  - "Admin panel"
  - "Kitchen view"
  - "Order flow from QR menu to kitchen view"
  - "Draft and publish flow"
  - "Protected staff areas"
  - "Database-backed storage"
  - "Hosting included"
not_included:
  - "Guaranteed sales increase"
  - "Guaranteed more bookings"
  - "Official certification"
price: "First month free, 219 SEK/month, 2500 SEK one-time fee, hosting included."
valid_until: ""
cta: "View demo or book a short walkthrough"
booking_or_purchase_link: "https://www.smartartai.se/nord-smart-menu"
allowed_claims:
  - "Guests can scan a QR code and order directly from mobile."
  - "Admin and kitchen areas are protected and separated from the public guest menu."
  - "Restaurant staff can manage menu content and publishing."
  - "The system includes a kitchen view for new and ongoing orders."
prohibited_claims:
  - "Guaranteed sales increase."
  - "Guaranteed more bookings."
  - "Official certification."
  - "The current restaurant website is weak or bad."
status: "draft"
approved_by_owner: false
last_updated: "2026-04-29"
```

## Offer Entry: StädSync AI Baspaket

```yaml
offer_id: "stadsync-ai-baspaket"
product_id: "stadsync-ai"
name: "StädSync AI Baspaket"
description: "Entry package for cleaning companies with 1 to 5 employees that need operational support for instructions, worker tasks, and core administration."
included:
  - "AI translation"
  - "RUT basic flow"
  - "Worker PWA"
  - "Role-based admin and worker views"
  - "Free onboarding"
  - "30-day risk-free evaluation without binding period"
not_included:
  - "Guaranteed Skatteverket approval"
  - "Legal, accounting, or tax advice"
  - "Official GDPR certification"
price: "999 kr/mån exkl. moms, for 1 to 5 employees."
valid_until: ""
cta: "Boka teknisk genomgång"
booking_or_purchase_link: "https://www.smartartai.se/stadsync-ai"
allowed_claims:
  - "Customer instructions in Swedish can be translated into the worker's language."
  - "Workers can receive clear task lists in a PWA app."
  - "Admin and worker views are separated by role."
  - "Free onboarding and 30-day risk-free evaluation without binding period are presented on the product page."
prohibited_claims:
  - "Guaranteed approval by Skatteverket."
  - "Official GDPR certification."
  - "Official Skatteverket-certified system."
  - "No more RUT errors guaranteed."
status: "draft"
approved_by_owner: false
last_updated: "2026-04-29"
```

## Offer Entry: StädSync AI Tillväxt

```yaml
offer_id: "stadsync-ai-tillvaxt"
product_id: "stadsync-ai"
name: "StädSync AI Tillväxt"
description: "Growth package for cleaning companies with 6 to 15 employees that need stronger operational control, multilingual task clarity, and RUT workflow support."
included:
  - "AI translation"
  - "Advanced RUT validation"
  - "Skatteverket XML export"
  - "Worker PWA"
  - "Traceable change and export log"
  - "Free onboarding"
  - "30-day risk-free evaluation without binding period"
not_included:
  - "Guaranteed Skatteverket approval"
  - "Legal, accounting, or tax advice"
  - "Official Skatteverket partnership"
price: "1 999 kr/mån exkl. moms, for 6 to 15 employees."
valid_until: ""
cta: "Boka teknisk genomgång"
booking_or_purchase_link: "https://www.smartartai.se/stadsync-ai"
allowed_claims:
  - "The RUT flow supports multiple buyers, personal number validation, amount conversion, and XML export for Skatteverket's e-service."
  - "Operational changes and exports can be tracked through a clear history."
  - "Workers can receive clear task lists in a PWA app."
  - "Admin and worker views are separated by role."
prohibited_claims:
  - "Guaranteed approval by Skatteverket."
  - "Official GDPR certification."
  - "Official Skatteverket-certified system."
  - "Guaranteed elimination of all RUT errors."
status: "draft"
approved_by_owner: false
last_updated: "2026-04-29"
```

## Offer Entry: StädSync AI Premium

```yaml
offer_id: "stadsync-ai-premium"
product_id: "stadsync-ai"
name: "StädSync AI Premium"
description: "Premium package for cleaning companies with 16+ employees that need operational overview, role separation, RUT workflow support, and careful handling of sensitive customer fields."
included:
  - "AI translation"
  - "Advanced RUT validation"
  - "Skatteverket XML export"
  - "Worker PWA"
  - "Server-level encryption for sensitive customer fields"
  - "Automatic anonymization after legal retention requirements"
  - "Traceable change and export log"
  - "Operational overview"
  - "Free onboarding"
  - "30-day risk-free evaluation without binding period"
not_included:
  - "Guaranteed Skatteverket approval"
  - "Legal, accounting, or tax advice"
  - "Official GDPR certification"
  - "Guaranteed removal of all administrative work"
price: "3 499 kr/mån exkl. moms, for 16+ employees."
valid_until: ""
cta: "Boka teknisk genomgång"
booking_or_purchase_link: "https://www.smartartai.se/stadsync-ai"
allowed_claims:
  - "Sensitive customer fields are encrypted at server level."
  - "Data can be anonymized automatically after legal retention requirements."
  - "Operational changes and exports can be tracked through a clear history."
  - "The platform provides admin and worker views separated by role."
prohibited_claims:
  - "Guaranteed approval by Skatteverket."
  - "Official GDPR certification."
  - "Official Skatteverket-certified system."
  - "Your current administration is bad."
status: "draft"
approved_by_owner: false
last_updated: "2026-04-29"
```

## Offer Rules

- Do not create discounts unless approved.
- Do not create guarantees unless approved.
- Do not imply limited availability unless true.
- Do not publish or send an offer unless owner-approved.
