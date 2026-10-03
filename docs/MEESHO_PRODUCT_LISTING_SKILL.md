---
name: meesho-product-listing
version: 1.0.0
description: Turn a product photo into a ready-to-publish Meesho listing package: separate image variants, SEO copy, product attributes, approximate measurements, pricing/inventory guidance, and compliance checks.
---

# Meesho Product Listing Skill

## Goal

When the user uploads a normal product image, convert it into a complete Meesho-ready listing so the user can copy/paste the data into the seller panel with minimal editing.

The output must be practical, field-by-field, and easy for a first-time seller to follow.

## Core behavior

### 1. Inspect the uploaded image first
Identify only what can reasonably be seen:
- Product type/category
- Main color(s)
- Visible material(s)
- Shape/style
- Quantity visible in the image
- Important visible features
- Possible dimensions/proportions
- Packaging, branding, accessories, or props if visible

Never claim a specification that cannot be supported by the image or the user's information.

### 2. Ask questions only when needed
Before generating the final listing, ask a maximum of 1–3 short questions when an answer would materially change the listing.

Priority questions:
1. What is the intended use of the product?
2. How many pieces are included in one customer order/pack?
3. Is the product branded, generic, imported, or manufactured locally?
4. If needed, ask for one critical missing fact such as actual weight or manufacturer details.

Do not ask questions whose answers can reasonably be inferred from the uploaded image.

If the user wants a quick draft and does not answer, proceed with clearly marked assumptions.

## Image-generation requirements

When the user asks for product images, generate **2–3 separate image variants**, not a collage.

### Mandatory image rules
- Each variant must be a separate image/file.
- One image = one product presentation.
- Never create a 2x2 collage, contact sheet, multi-panel image, or four images inside one file.
- Keep the product visually consistent with the uploaded product.
- Do not change the product's color, shape, handle, blade, logo, texture, or proportions without explicit instruction.
- Use clean e-commerce styling suitable for Meesho.
- Primary image: product alone, clean/white background, no text, no watermark, no unnecessary props.
- Secondary images can show angle/detail/use information when appropriate.
- If Meesho's category-specific image rules are known, follow them.
- Never put measurements/text on a primary image if the marketplace disallows text there.
- For a measurement image, use one product only and clearly label estimated measurements when measurements are not physically verified.

### Recommended 3 image variants
1. **Primary image:** clean front/hero product photo, single product, white background, no text.
2. **Angle/detail image:** different angle showing important construction, texture, finish, or useful detail.
3. **Size/features image:** single product with measurement arrows or concise feature callouts, only if the marketplace allows it.

If the user requests exactly 2 images, create only 2. If exactly 1 image is requested, create only 1.

## Measurement rules

Measurements should be handled in this order:

### A. If the user provides actual measurements
Use them as the source of truth.

### B. If an image visibly contains measurements
Read those values and use them, but distinguish between user-provided/visible values and AI-generated or inferred values.

### C. If no measurements are provided
Estimate dimensions from the image only as an **approximation**.

For every estimated measurement, label it:
- `Approximate / visually estimated`

Do not present visual estimates as exact specifications.

Useful Meesho fields may include:
- Product Length
- Product Breadth
- Product Height
- Maximum Blade Length
- Maximum Blade Width
- Product Weight
- Weight Unit
- Product Unit
- Net Quantity

For products where weight cannot be reliably inferred from the image, say:
- `Approximate weight: estimate only; verify with a weighing scale before publishing.`

### Unit conversion
Show the value that matches the marketplace field.
Examples:
- cm to inch: cm / 2.54
- inch to cm: inch * 2.54

When the dropdown only offers coarse choices, provide:
- Recommended selection
- Actual/estimated value
- Note that the dropdown choice is the closest available option

Never invent a measurement just to satisfy a required field.

## Product quantity and pack logic

Always distinguish between:
- quantity per customer order
- inventory count
- total physical pieces owned

Example:
If the user has 6 knives and sells 2 knives per pack:
- Pack quantity / Net Quantity = 2
- Inventory = 3 packs
- Customer receives = 2 knives per order
- Customer should not be represented as buying a single knife

The listing title, description, images, quantity, and inventory must all agree.

If the marketplace has no explicit pack-quantity field, explain how the pack should be represented and warn the user not to rely on the title alone to enforce quantity.

## Pricing logic

When the user gives a target customer price that includes shipping:
- Separate product price from shipping.
- Use the marketplace's displayed shipping charge to estimate the required product price.
- State that the final customer price can vary if marketplace shipping varies by destination, weight, or policy.

Always distinguish:
- Meesho Price / seller-set product price
- Shipping shown to customer
- Customer total
- Expected bank settlement

Never guarantee the exact settlement amount unless the marketplace explicitly provides it.

## HSN and GST

Provide HSN/GST only when the classification is reasonably identifiable.

For tax/compliance fields:
- Do not rely on the image alone for a legal classification when the product's intended use matters.
- Verify the current HSN and GST rate using authoritative/current sources when needed.
- Prefer official Indian government/CBIC sources for GST rates.
- If uncertain, explicitly say `Verify with supplier/CA before submission.`
- Never fabricate an HSN code.

## Manufacturer / packer / importer

Do not invent these fields.

Use:
- Manufacturer Name
- Manufacturer Address
- Manufacturer Pincode
- Packer Name
- Packer Address
- Packer Pincode
- Importer Name
- Importer Address
- Importer Pincode

If the user does not have these details, tell them exactly which information they need to obtain from the supplier/packaging.

For Country of Origin, use the actual manufacturing country, not the seller's location.

## SEO rules

The aim is relevant search visibility, not keyword stuffing.

### Product title
Create a title using this structure when appropriate:
`[Primary Keyword] + [Key Feature] + [Material/Style] + [Color] + [Pack Quantity]`

Rules:
- Clear and human-readable
- Include the main buyer search term naturally
- Include pack quantity when applicable
- Include one or two important features
- Do not stuff synonyms repeatedly
- Do not make unsupported claims
- Do not use competitor brand names

### Description
Create a copy-paste description with:
- One-sentence overview
- Key features
- Material
- Color
- Quantity
- Dimensions, marked approximate when necessary
- Care/use instructions where relevant
- Pack contents

### Search terms
Optionally provide 5–10 relevant search phrases that are naturally related to the product.
Do not recommend misleading or unrelated keywords.

## Meesho-ready output format

Always return the final answer in this exact practical structure unless the user asks for another format.

# 1. Product Summary
- Product:
- Intended use:
- Pack quantity:
- Color:
- Material:
- Brand:

# 2. Meesho Fields — Copy/Paste
| Meesho Field | Value | Notes |
|---|---|---|
| Product Name | ... | ... |
| GST | ... | ... |
| HSN Code | ... | ... |
| Size | ... | ... |
| Color | ... | ... |
| Generic Name | ... | ... |
| Material | ... | ... |
| Maximum Blade Length | ... | ... |
| Maximum Blade Width | ... | ... |
| Net Quantity | ... | ... |
| Product Length | ... | ... |
| Product Breadth | ... | ... |
| Product Height | ... | ... |
| Product Unit | ... | ... |
| Product Weight | ... | ... |
| Product Weight Unit | ... | ... |
| Country of Origin | ... | ... |
| Brand | ... | ... |

Only include category-specific fields that apply.

# 3. Measurements
Provide both the estimated/visible value and the marketplace-friendly dropdown choice when useful.

Example:
- Total length: ~22 cm / ~8.66 in — approximate
- Blade length: ~11.5 cm / ~4.53 in — approximate
- Handle length: ~10.5 cm / ~4.13 in — approximate
- Product weight: ~XX g — approximate; verify physically

# 4. Pricing & Inventory
- Meesho Price:
- Customer shipping:
- Estimated customer total:
- Expected bank settlement:
- Pack quantity:
- Inventory packs:
- Total physical pieces:

Show the math briefly.

# 5. SEO Title
Provide one primary title and optionally 2 alternative titles.

# 6. SEO Description
Provide a polished copy-paste description under 1400 characters unless the marketplace field allows more.

# 7. Search Keywords
Provide 5–10 natural, relevant search phrases.

# 8. Image Plan
Give the exact purpose of each image:
1. Primary image
2. Angle/detail
3. Size/features/use

# 9. Compliance / Verification
List only the facts the user must verify before publishing:
- Actual weight
- Exact dimensions
- HSN/GST if uncertain
- Manufacturer/packer/importer details
- Country of origin
- MRP

## Copy-paste principle

The user should be able to take the answer and paste values directly into Meesho.

Use short values for fields and a separate Notes column for caveats.

Do not bury the actual value inside long paragraphs.

## First-time seller mode

Because the user may be new to Meesho:
- Explain confusing fields in very simple language.
- When a field means "per pack", say so.
- When inventory means "number of packs", say so.
- Explicitly explain what the customer sees versus what the seller receives.
- If a marketplace field has a dropdown with coarse values, tell the user exactly which dropdown option is closest.

## Accuracy and honesty

Never pretend that an AI-generated product photo is a verified photograph of the actual item.

Never turn an estimate into a fact.

If the product image is low quality or the product cannot be identified confidently, say what is uncertain and ask one focused question instead of guessing multiple critical fields.

## Example of desired behavior

User uploads one photo of a blue-handled serrated knife and says:
"I want to sell 2 for ₹200. I have 6 knives."

The skill should infer the commercial structure:
- Customer pack = 2 knives
- Price = ₹200 per 2-piece pack
- Inventory = 3 packs
- Net Quantity = 2
- Title must say Pack of 2
- Images should show 2 knives when demonstrating pack quantity
- Primary image should follow the marketplace rule and avoid prohibited text/props
- Product measurements should be approximate unless physically verified
- Manufacturer details must come from the supplier, not AI inference

## Final quality check

Before responding, check:
- Are there separate image variants rather than a collage?
- Does the title match the pack quantity?
- Does inventory mean packs rather than individual units?
- Are measurements clearly marked approximate when inferred?
- Is every required Meesho field covered?
- Are HSN/GST claims current and appropriately qualified?
- Are manufacturer/importer details left for the user to verify rather than invented?
- Can the user copy/paste the title, description, and field values directly?
