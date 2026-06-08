# Layout Component Refactoring Guide

This document explains how to use the new layout components to eliminate repetition and improve consistency across the application.

## Available Layout Components

### 1. LandingPageLayout
For authentication and landing pages (login, signup, email verification, etc.)

**Usage:**
```tsx
import { LandingPageLayout } from "../layouts";

const LoginPage = () => {
  return (
    <LandingPageLayout title="Welcome to PACT Network">
      {/* Your form content here */}
    </LandingPageLayout>
  );
};
```

**Props:**
- `children`: React.ReactNode - The main content
- `title?`: string - Hero section title (default: "Helping you adopt PACT standards with ease")

### 2. FunctionalPageLayout
Base layout for all functional pages with sidebar navigation

**Usage:**
```tsx
import { FunctionalPageLayout } from "../layouts";

const MyPage = () => {
  return (
    <FunctionalPageLayout loading={isLoading} loadingMessage="Loading data...">
      {/* Your page content */}
    </FunctionalPageLayout>
  );
};
```

**Props:**
- `children`: React.ReactNode - The main content
- `loading?`: boolean - Shows loading spinner instead of content
- `loadingMessage?`: string - Message to show during loading

### 3. GridPageLayout
For list/table pages with headers and action buttons

**Usage:**
```tsx
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";

const UsersPage = () => {
  const headerActions = (
    <ActionButton onClick={() => navigate('/add-user')}>
      Add User
    </ActionButton>
  );

  return (
    <GridPageLayout
      title="Organization Users"
      subtitle="Manage users in your organization"
      actions={headerActions}
      loading={loading}
    >
      <DataTable columns={columns} data={data} />
    </GridPageLayout>
  );
};
```

**Props:**
- `title`: string - Page title
- `subtitle?`: string - Optional subtitle
- `actions?`: React.ReactNode - Header action buttons
- `children`: React.ReactNode - The main content (usually DataTable)
- `loading?`: boolean - Shows loading state
- `loadingMessage?`: string - Loading message

### 4. FormPageLayout
For edit, view, and add pages with forms

**Usage:**
```tsx
import { FormPageLayout } from "../layouts";

const EditUserPage = () => {
  return (
    <FormPageLayout
      title="Edit User"
      subtitle="Update user information"
      loading={loading}
      maxWidth="600px"
    >
      <Form.Root>
        {/* Your form fields */}
      </Form.Root>
    </FormPageLayout>
  );
};
```

**Props:**
- `title`: string - Page title
- `subtitle?`: string - Optional subtitle
- `children`: React.ReactNode - The form content
- `loading?`: boolean - Shows loading state
- `loadingMessage?`: string - Loading message
- `maxWidth?`: string - Maximum width of form container (default: "800px")

## Additional Components

### PageHeader
Reusable header component with title and actions

```tsx
import PageHeader from "../components/PageHeader";

<PageHeader 
  title="Page Title"
  subtitle="Optional subtitle"
  actions={<Button>Action</Button>}
/>
```

### ActionButton
Consistent button component with predefined styles

```tsx
import ActionButton from "../components/ActionButton";

<ActionButton
  variant="primary"    // "primary" | "secondary" | "outline"
  size="medium"        // "small" | "medium" | "large" 
  onClick={handleClick}
  disabled={false}
>
  Button Text
</ActionButton>
```

## Migration Examples

### Before (OrganizationUsers.tsx):
```tsx
const OrganizationUsers = () => {
  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Organization Users</h2>
          <Button onClick={() => navigate("/add")}>Add User</Button>
        </div>
        <div>
          <DataTable columns={columns} data={users} />
        </div>
      </main>
    </>
  );
};
```

### After (Using GridPageLayout):
```tsx
const OrganizationUsers = () => {
  const headerActions = (
    <ActionButton onClick={() => navigate("/add")}>
      Add User
    </ActionButton>
  );

  return (
    <GridPageLayout
      title="Organization Users"
      actions={headerActions}
      loading={loading}
    >
      <DataTable columns={columns} data={users} />
    </GridPageLayout>
  );
};
```

## Benefits

1. **Consistency**: All pages follow the same layout patterns
2. **Reduced Code**: Eliminates 50-80% of layout boilerplate
3. **Maintainability**: Layout changes only need to be made in one place
4. **Loading States**: Built-in loading spinner handling
5. **Responsive**: Layouts handle responsive design automatically
6. **Accessibility**: Consistent semantic structure across pages

## Migration Strategy

1. Start with the most repeated patterns (sidebar + header layouts)
2. Migrate one page at a time
3. Test each migration thoroughly
4. Update any custom styling to work with the new layouts
5. Remove old layout code once migration is complete

## Best Practices

1. Use `GridPageLayout` for any page with a DataTable
2. Use `FormPageLayout` for any page with forms
3. Use `LandingPageLayout` for authentication flows
4. Always provide loading states for data-dependent pages
5. Use `ActionButton` for consistent button styling
6. Keep page-specific logic in the page components, layout logic in layouts