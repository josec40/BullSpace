// USF Tampa Campus Building Coordinates
// Approximate locations based on USF campus map

export const buildingCoordinates = {
    "Engineering Building II": {
        name: "Engineering Building II",
        coordinates: [28.0595, -82.4143],
        address: "4202 E Fowler Ave, Tampa, FL 33620",
        abbreviation: "ENB"
    },
    "Marshall Student Center": {
        name: "Marshall Student Center",
        coordinates: [28.0650, -82.4180],
        address: "4202 E Fowler Ave, Tampa, FL 33620",
        abbreviation: "MSC"
    },
    "Interdisciplinary Sciences": {
        name: "Interdisciplinary Sciences",
        coordinates: [28.0615, -82.4135],
        address: "4202 E Fowler Ave, Tampa, FL 33620",
        abbreviation: "ISA"
    },
    "Library": {
        name: "Library",
        coordinates: [28.0638, -82.4152],
        address: "4202 E Fowler Ave, Tampa, FL 33620",
        abbreviation: "LIB"
    },
    "Recreation Center": {
        name: "Recreation Center",
        coordinates: [28.0645, -82.4125],
        address: "4202 E Fowler Ave, Tampa, FL 33620",
        abbreviation: "REC"
    }
};

// Helper to get all building names
export const getBuildingNames = () => Object.keys(buildingCoordinates);

// Helper to get building by abbreviation
export const getBuildingByAbbr = (abbr) => {
    return Object.values(buildingCoordinates).find(b => b.abbreviation === abbr);
};
