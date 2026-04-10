/**
 * QX Travel - Tailwind CSS Configuration
 * Custom theme configuration for the QX Travel website
 */

tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                secondary: '#695d45',
                'surface-container': '#eeeeee',
                'secondary-fixed-dim': '#d5c4a8',
                error: '#ba1a1a',
                'inverse-on-surface': '#f1f1f1',
                'on-surface-variant': '#44474c',
                'on-secondary-container': '#6e6149',
                'on-secondary-fixed': '#231a08',
                'surface-dim': '#dadada',
                'tertiary-fixed-dim': '#88d3db',
                'surface-variant': '#e2e2e2',
                'primary-fixed-dim': '#b8c8df',
                primary: '#00050e',
                'secondary-container': '#efddc0',
                'on-secondary-fixed-variant': '#51452f',
                'tertiary-fixed': '#a4eff8',
                'on-primary': '#ffffff',
                'tertiary-container': '#002225',
                'on-background': '#1a1c1c',
                surface: '#ffffff',
                background: '#ffffff',
                'on-secondary': '#ffffff',
                'primary-fixed': '#d4e4fb',
                'surface-container-high': '#e8e8e8',
                outline: '#74777d',
                'outline-variant': '#c4c6cd',
                'on-error': '#ffffff',
                'on-surface': '#1a1c1c',
                'on-primary-container': '#78879c',
                'secondary-fixed': '#f2e0c2',
                'inverse-primary': '#b8c8df',
                'surface-container-low': '#ffffff',
                'on-tertiary': '#ffffff',
                'error-container': '#ffdad6',
                'surface-tint': '#506073',
                'on-tertiary-container': '#449199',
                tertiary: '#000506',
                'surface-container-highest': '#e2e2e2',
                'on-error-container': '#93000a',
                'inverse-surface': '#2f3131',
                'primary-container': '#0f1f30',
                'surface-bright': '#f9f9f9',
                'on-tertiary-fixed-variant': '#004f55',
                'on-primary-fixed-variant': '#39485b',
                'surface-container-lowest': '#ffffff',
                'on-primary-fixed': '#0c1d2d',
                'on-tertiary-fixed': '#002023'
            },
            borderRadius: {
                DEFAULT: '0.125rem',
                lg: '0.25rem',
                xl: '0.5rem',
                full: '0.75rem'
            },
            fontFamily: {
                headline: ['Noto Serif', 'serif'],
                body: ['Manrope', 'sans-serif'],
                label: ['Work Sans', 'sans-serif']
            }
        }
    }
};
