# Technical Requirements — Data Structure

> **Джерело**: NEW BRAND CONSTRUCTOR — Google Doc, розділ "Technical Requirements / Data Structure"

---

## Data Structure

### Brand

```
Brand {
  id: string (auto-generated)
  internal_name: string
  external_naming_id: reference
  internal_naming: string
  created_by: user_id
  created_date: timestamp
  status: enum [draft, pending_cpo, pending_ceo, approved, rejected]

  geos: array[string]
  description: text

  concept_id: reference
  concept_comments: text

  external_naming_comments: text
  internal_naming_comments: text

  marketing_package_id: reference
  marketing_comments: text

  legal_landing: boolean
  partner_starter: boolean

  components: {
    banners: component_variant_id
    tabbar: component_variant_id
    header: component_variant_id
    thumbnails: component_variant_id
    sidebar: component_variant_id
    theme: enum [light, dark]
  }

  confluence_page_url: string
  jira_epic_ids: array[string]
}
```

### Concept

```
Concept {
  id: string
  name: string
  description: text
  visual_assets: array[file_url]
  logo: file_url (optional)
  preview_template: file_url
  naming_ids: array[reference] (optional)
  created_by: user_id
  created_date: timestamp
  status: enum [active, archived]
  used_in_brand_id: reference (optional)
}
```

### Naming

```
Naming {
  id: string
  name: string
  type: enum [external, internal]
  concept_id: reference (optional, only for external)
  created_by: user_id
  created_date: timestamp
  status: enum [active, archived]
  used_in_brand_id: reference (optional)
}
```

### Component

```
Component {
  id: string
  type: enum [banner, tabbar, header, thumbnail, sidebar, theme]
  variants: array[ComponentVariant]
}
```

### ComponentVariant

```
ComponentVariant {
  id: string
  component_id: reference
  name: string (e.g., "Type 1", "Type 2")
  preview_image: file_url
  template_file: file_url
  created_by: user_id
  created_date: timestamp
  status: enum [active, archived]
  used_in_brands: array[brand_id]
}
```

### MarketingPackage

```
MarketingPackage {
  id: string
  name: string (e.g., "Package 1")
  description: text
  activities: array[string]
  timeline: string
  resources_needed: text
}
```

---

## System Architecture

- **Frontend**: Admin panel (constructor interface), Library management interface, Authentication & permissions
- **Backend** (необовʼязково): API for CRUD operations, File storage for visual assets, Preview generation service
- **Integrations**: (визначаються окремо)
