export const SHIP_SCALE_UNITS = { canonLength: "m", modelLength: "mm" };

export const SHIP_SCALE_DATA = {
    labels: [
        "GR75",
        "Gozanti",
        "CR90",
        "Raider",
        "Arquitens",
        "Pelta",
        "Nebulon B",
        "Gladiator",
        "MC30c",
        "Assault Frigate Mk II",
        "Victory Star Destroyer",
        "Interdictor",
        "MC80 Liberty",
        "MC80",
        "Imperial Star Destroyer",
        "X-Wing",
        "TIE Fighter",
        "TIE Interceptor"
	],
    datasets: [
        {
            label: "Model to Canon Scale",
            fill: false,
            backgroundColor: "rgba(75,192,192,0.4)",
            pointBorderColor: "rgba(75,192,192,1)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(75,192,192,1)",
            pointHoverBorderColor: "rgba(220,220,220,1)",
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            pointHitRadius: 10,
            data: [
                { x: 90, y: 41.64 },
                { x: 63.8, y: 36.71 },
                { x: 150, y: 57.62 },
                { x: 150, y: 57.81 },
                { x: 250, y: 73.03 },
                { x: 282, y: 79.38 },
                { x: 300, y: 91.15 },
                { x: 500, y: 90.88 },
                { x: 580, y: 110.64 },
                { x: 700, y: 120 },
                { x: 900, y: 137.39 },
                { x: 1100, y: 160 },
                { x: 1200, y: 176 },
                { x: 1200, y: 185 },
                { x: 1600, y: 207 },
                { x: 12.5, y: 14 },
                { x: 6.3, y: 7 },
                { x: 6.6, y: 12 }
            ]
        }
    ]
};