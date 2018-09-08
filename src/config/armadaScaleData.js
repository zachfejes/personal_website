export const SHIP_SCALE_OPTIONS = {
    legend: {
        display: false
    },
    tooltips: {
        caretPadding: 7,
        displayColors: false,
        callbacks: {
            label: (tooltipItem) => {
                return SHIP_SCALE_DATA.labels[tooltipItem.index] || "";
            }
        }
    },
    scales: {
        xAxes: [{
            scaleLabel: {
                display: true,
                labelString: "Canonical Length [m]"
            },
            ticks: {
                callback: function(value) {
                    return value;
                }
            },
            gridLines: {
                color: "rgba(255, 255, 255, 0.05)"
            }
        }],
        yAxes: [{
            scaleLabel: {
                display: true,
                labelString: "Model Length [mm]"
            },
            ticks: {
                callback: function(value, index, values) {
                    return value;
                }
            },
            gridLines: {
                color: "grba(255, 255, 255, 0.05"
            }
        }]
    }
};


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
            label: "Fit Curve",
            type:"line",
            data: [
                { x: 0, y: 0 },
                { x: 18, y: 16.9369941 },
                { x: 36, y: 24.85227382 },
                { x: 54, y: 31.10139109 },
                { x: 72, y: 36.4666546 },
                { x: 90, y: 41.25784526 },
                { x: 108, y: 45.636214 },
                { x: 126, y: 49.69864774 },
                { x: 144, y: 53.5088623 },
                { x: 162, y: 57.11146393 },
                { x: 180, y: 60.53915242 },
                { x: 198, y: 63.81676274 },
                { x: 216, y: 66.96369376 },
                { x: 234, y: 69.9954482 },
                { x: 252, y: 72.92465206 },
                { x: 270, y: 75.76175402 },
                { x: 288, y: 78.51551989 },
                { x: 306, y: 81.19339095 },
                { x: 324, y: 83.80174965 },
                { x: 342, y: 86.34612024 },
                { x: 360, y: 88.83132293 },
                { x: 378, y: 91.26159403 },
                { x: 396, y: 93.64068098 },
                { x: 414, y: 95.97191821 },
                { x: 432, y: 98.25828852 },
                { x: 450, y: 100.5024732 },
                { x: 468, y: 102.7068932 },
                { x: 486, y: 104.8737435 },
                { x: 504, y: 107.0050217 },
                { x: 522, y: 109.1025519 },
                { x: 540, y: 111.1680056 },
                { x: 558, y: 113.202919 },
                { x: 576, y: 115.2087075 },
                { x: 594, y: 117.1866793 },
                { x: 612, y: 119.1380461 },
                { x: 630, y: 121.0639329 },
                { x: 648, y: 122.9653867 },
                { x: 666, y: 124.8433834 },
                { x: 684, y: 126.6988351 },
                { x: 702, y: 128.5325953 },
                { x: 720, y: 130.3454643 },
                { x: 738, y: 132.1381937 },
                { x: 756, y: 133.9114904 },
                { x: 774, y: 135.6660205 },
                { x: 792, y: 137.4024121 },
                { x: 810, y: 139.1212589 },
                { x: 828, y: 140.8231222 },
                { x: 846, y: 142.5085336 },
                { x: 864, y: 144.1779974 },
                { x: 882, y: 145.8319919 },
                { x: 900, y: 147.470972 },
                { x: 918, y: 149.0953702 },
                { x: 936, y: 150.7055985 },
                { x: 954, y: 152.3020494 },
                { x: 972, y: 153.8850976 },
                { x: 990, y: 155.4551006 },
                { x: 1008, y: 157.0124003 },
                { x: 1026, y: 158.5573236 },
                { x: 1044, y: 160.0901835 },
                { x: 1062, y: 161.6112797 },
                { x: 1080, y: 163.1208997 },
                { x: 1098, y: 164.6193191 },
                { x: 1116, y: 166.1068028 },
                { x: 1134, y: 167.5836049 },
                { x: 1152, y: 169.04997 },
                { x: 1170, y: 170.5061331 },
                { x: 1188, y: 171.9523207 },
                { x: 1206, y: 173.3887506 },
                { x: 1224, y: 174.8156329 },
                { x: 1242, y: 176.2331701 },
                { x: 1260, y: 177.6415574 },
                { x: 1278, y: 179.0409835 },
                { x: 1296, y: 180.4316303 },
                { x: 1314, y: 181.8136738 },
                { x: 1332, y: 183.187284 },
                { x: 1350, y: 184.5526252 },
                { x: 1368, y: 185.9098565 },
                { x: 1386, y: 187.2591318 },
                { x: 1404, y: 188.6006002 },
                { x: 1422, y: 189.9344061 },
                { x: 1440, y: 191.2606895 },
                { x: 1458, y: 192.579586 },
                { x: 1476, y: 193.8912272 },
                { x: 1494, y: 195.1957408 },
                { x: 1512, y: 196.4932506 },
                { x: 1530, y: 197.7838771 },
                { x: 1548, y: 199.0677371 },
                { x: 1566, y: 200.344944 },
                { x: 1584, y: 201.6156083 },
                { x: 1602, y: 202.8798373 },
                { x: 1620, y: 204.1377354 },
                { x: 1638, y: 205.3894039 },
                { x: 1656, y: 206.6349419 },
                { x: 1674, y: 207.8744454 },
                { x: 1692, y: 209.108008 },
                { x: 1710, y: 210.3357211 },
                { x: 1728, y: 211.5576735 },
                { x: 1746, y: 212.7739518 },
                { x: 1764, y: 213.9846405 },
                { x: 1782, y: 215.1898218 },
                { x: 1800, y: 216.3895762 }
            ],
            fill: false,
            showLine: true,
            borderColor: "rgba(255, 255, 255, 0.2)",
            backgroundColor: "#EC932F",
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,

        },
        {
            label: "Ship Scale",
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