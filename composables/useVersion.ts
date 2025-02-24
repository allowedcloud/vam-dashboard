export const useVersion = () => {
    const appConfig = useAppConfig();
    
    return computed(() => ({
      version: appConfig.version,
      lastUpdated: new Date(appConfig.lastUpdated),
      // Helper function to format the date
      formatLastUpdated: (format = 'full') => {
        const date = new Date(appConfig.lastUpdated);
        if (format === 'full') {
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        if (format === 'date') {
          return date.toLocaleDateString();
        }
        if (format === 'time') {
          return date.toLocaleTimeString();
        }
        return date.toISOString();
      }
    }));
  };
  