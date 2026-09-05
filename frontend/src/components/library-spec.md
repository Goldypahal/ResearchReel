# ResearchReel UI Component Library Specification

## Overview
This document specifies the reusable UI components used throughout the ResearchReel application. These components are designed with a sleek dark-mode-first aesthetic inspired by modern glassmorphic design and rich accent gradients.

## Design Principles

### 1. Consistent Aesthetics
- All components use standard CSS variables (indigo/violet brand gradients, glass panels with backdrop blurs).
- Uniform padding and margins adhering to a 4px grid.

### 2. Micro-interactions
- Buttons and interactive items use subtle animations (e.g. Framer Motion scale-down on tap) to provide feedback.

### 3. Accessible Layouts
- High contrast themes are fully supported.
- Native HTML element tags are preserved under the hood to align with screen reader expectations.

---

## Component Specifications

### 1. Button
- **Path**: `src/components/ui/Button.tsx`
- **Variants**: `default`, `outline`, `secondary`, `destructive`, `ghost`, `link`, `gradient`.
- **Sizes**: `default`, `sm`, `md`, `lg`, `icon`.

### 2. Badge
- **Path**: `src/components/ui/Badge.tsx`
- **Variants**: `default` (Indigo), `secondary` (Gray/Border), `destructive` (Red/Border), `success` (Emerald/Border), `warning` (Amber/Border), `outline`.

### 3. Glass Card
- **Path**: `src/components/ui/Card.tsx`
- **Sub-components**: `Card`, `CardHeader`, `CardTitle`, `CardContent`.
- **Styling**: Leverages `@apply glass` backdrop blur.

### 4. Input Fields
- **Path**: `src/components/ui/Input.tsx`
- **States**: Focused borders highlight in indigo. Disabled inputs reduce opacity.

### 5. Checkbox
- **Path**: `src/components/ui/Checkbox.tsx`
- **Purpose**: Multi-selection and toggle filters.

### 6. DatePicker
- **Path**: `src/components/ui/DatePicker.tsx`
- **Purpose**: Date range input fields mapping a start/end date.

### 7. Select Dropdown
- **Path**: `src/components/ui/Select.tsx`
- **Details**: Elegant native dropdown select wrapped to match shadcn select composition patterns.

### 8. Table
- **Path**: `src/components/ui/Table.tsx`
- **Sub-components**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.

### 9. Alert Banners
- **Path**: `src/components/ui/Alert.tsx`
- **Variants**: `info`, `success`, `warning`, `destructive` with corresponding Lucide icons.

### 10. Toasts
- **Path**: `src/components/ui/Toast.tsx`, `use-toast.ts`
- **Purpose**: Floating user feedback popups that dismiss after a configurable timeout.
