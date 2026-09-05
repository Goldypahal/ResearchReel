# ResearchReel UI Component Library Documentation

This document explains how to import and use the UI Component Library in ResearchReel.

## Getting Started

All UI components are exported from the `@/components/ui` barrel file:

```typescript
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Input, Alert, toast } from "@/components/ui";
```

---

## Component Reference

### 1. Button
Variants: `default`, `outline`, `secondary`, `destructive`, `ghost`, `link`, `gradient`.
Sizes: `default`, `sm`, `lg`, `icon`.

```tsx
// Interactive gradient button
<Button variant="gradient" size="lg" onClick={() => console.log('Clicked')}>
  Generate Reel
</Button>

// Simple outline icon button
<Button variant="outline" size="icon">
  <Search size={16} />
</Button>
```

### 2. Badge
Variants: `default`, `secondary`, `destructive`, `success`, `warning`, `outline`.

```tsx
<Badge variant="success">Verified Peer</Badge>
<Badge variant="warning">Under Review</Badge>
```

### 3. Card
Glassmorphic panels for grouping layout sections.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Research Paper Summary</CardTitle>
  </CardHeader>
  <CardContent>
    This paper introduces novel RAG techniques...
  </CardContent>
</Card>
```

### 4. Input
Text inputs with standard styling.

```tsx
<Input placeholder="Search DOIs..." onChange={(e) => console.log(e.target.value)} />
```

### 5. Checkbox
Standard checkbox for list filters.

```tsx
<Checkbox checked={checked} onChange={(val) => setChecked(val)} />
```

### 6. DatePicker
Dual-input date-range selector.

```tsx
<DatePicker onChange={(range) => console.log('Range:', range)} />
```

### 7. Select
Dropdown options using native elements for reliability.

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="quantum">Quantum Physics</SelectItem>
    <SelectItem value="ai">Artificial Intelligence</SelectItem>
  </SelectContent>
</Select>
```

### 8. Table
Simple data table grids.

```tsx
<Table>
  <Header>
    <HeaderRow>
      <HeaderCell>Paper Title</HeaderCell>
      <HeaderCell>Author</HeaderCell>
    </HeaderRow>
  </Header>
  <Body>
    <Row>
      <Cell>Quantum Computing Basics</Cell>
      <Cell>Albert Einstein</Cell>
    </Row>
  </Body>
</Table>
```

### 9. Alert
Banners with inline status icons.

```tsx
<Alert variant="warning" title="API Rate Limit">
  You have reached your daily video generation quota.
</Alert>
```

### 10. Toast
Floating notification events triggerable from anywhere.

```tsx
import { toast } from "@/components/ui";

// Inside a component action:
toast({
  variant: "success",
  title: "Paper Saved",
  description: "The paper has been successfully added to your library.",
  duration: 3000
});
```
