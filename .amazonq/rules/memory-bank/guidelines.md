# Filora - Development Guidelines

## Code Quality Standards

### Python/Django Backend Standards
- **Documentation**: Use triple-quoted docstrings for module-level documentation
- **Import Organization**: Standard library imports first, then Django imports
- **Path Handling**: Use `pathlib.Path` for file system operations (`BASE_DIR = Path(__file__).resolve().parent.parent`)
- **Configuration**: Follow Django's settings structure with clear section comments
- **URL Patterns**: Use descriptive URL names and organize with `path()` function

### JavaScript/React Frontend Standards
- **Import Order**: React imports first, then local imports, then utilities
- **Component Structure**: Use functional components with hooks
- **Performance**: Implement `React.StrictMode` for development checks
- **ES6 Syntax**: Use modern JavaScript features (arrow functions, destructuring, imports)

## Structural Conventions

### Django Backend Patterns
- **Settings Organization**: Group settings by functionality with inline comments
- **Security**: Use environment-specific configurations (DEBUG, SECRET_KEY)
- **Database**: Default to SQLite for development with path-based configuration
- **Middleware**: Standard Django middleware stack in recommended order
- **Apps**: Use Django's built-in apps as foundation (admin, auth, contenttypes)

### React Frontend Patterns
- **Entry Point**: Use `ReactDOM.createRoot()` for React 18+ applications
- **Performance Monitoring**: Integrate web vitals with conditional loading
- **Component Mounting**: Wrap main app in `React.StrictMode` for development
- **CSS Integration**: Import global styles at application entry point

## Development Practices

### Code Organization
- **Separation of Concerns**: Clear frontend/backend boundaries
- **Configuration Management**: Centralized settings in dedicated files
- **Performance Optimization**: Lazy loading for non-critical features
- **Error Handling**: Graceful degradation with proper exception handling

### API Design Patterns
- **URL Structure**: RESTful patterns with admin interface separation
- **Authentication**: Django's built-in auth system integration
- **Static Files**: Proper static file handling configuration
- **CORS**: Prepare for cross-origin requests between frontend/backend

### Testing Standards
- **React Testing**: Use React Testing Library for component testing
- **Performance**: Monitor web vitals in production applications
- **Development Tools**: Leverage Create React App's built-in testing capabilities

## Common Implementation Patterns

### Django Configuration
```python
# Path resolution pattern
BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration pattern
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### React Application Setup
```javascript
// Modern React mounting pattern
const root = ReactDOM.create Root(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Performance Monitoring
```javascript
// Conditional performance tracking
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Dynamic import for performance metrics
  }
};
```