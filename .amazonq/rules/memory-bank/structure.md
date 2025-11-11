# Filora - Project Structure

## Directory Organization

### Frontend (React)
- **src/**: React application source code
  - `App.js` - Main application component
  - `index.js` - Application entry point
  - `index.css` - Global styles
  - `reportWebVitals.js` - Performance monitoring
  - `setupTests.js` - Test configuration
- **public/**: Static assets and HTML template
  - `index.html` - Main HTML template
  - `manifest.json` - PWA configuration
  - Icons and favicon files

### Backend (Django)
- **backend/**: Django project root
  - **backend/**: Django configuration package
    - `settings.py` - Django settings and configuration
    - `urls.py` - URL routing configuration
    - `asgi.py` - ASGI application setup
    - `wsgi.py` - WSGI application setup
  - `manage.py` - Django management script

### Configuration Files
- `package.json` - Node.js dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `README.md` - Project documentation
- `.gitignore` - Git ignore patterns

## Core Components
- **React Frontend**: Component-based UI with modern React patterns
- **Django Backend**: RESTful API server with Django framework
- **Build System**: Create React App for frontend, Django for backend
- **Styling**: Tailwind CSS for utility-first styling approach

## Architectural Patterns
- **Separation of Concerns**: Clear frontend/backend separation
- **Component Architecture**: React component-based frontend structure
- **MVC Pattern**: Django's Model-View-Controller backend architecture
- **API-First Design**: Backend designed as API service for frontend consumption