import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
  "#775DD0",
];

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);//login page 

  // Filters
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [taluka, setTaluka] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("सुरु (हे.)"); // New state for metric selection

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/converted_chat_2.json");
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Set default year when data loads
  useEffect(() => {
    if (data.length > 0 && !selectedYear) {
      const years = data.flatMap((div) =>
        div.districts.flatMap((dist) =>
          dist.talukas.map((t) => t.year)
        )
      );
      const uniqueYears = [...new Set(years)].filter(Boolean).sort();
      if (uniqueYears.length > 0) {
        // setSelectedYear(uniqueYears[0]);
        const defaultYear = uniqueYears.includes("२०२५-२०२६") ? "२०२५-२०२६" : uniqueYears[0];
        setSelectedYear(defaultYear);
      }
    }
  }, [data, selectedYear]);

  // Reset and set default date when selectedYear changes
  useEffect(() => {
    if (selectedYear) {
      // Get dates for the selected year
      let filteredData = data.flatMap((div) =>
        div.districts.flatMap((dist) => dist.talukas)
      );
      
      filteredData = filteredData.filter((t) => t.year === selectedYear);
      const dates = filteredData.map((t) => t.month);
      const uniqueDates = [...new Set(dates)].filter(Boolean).sort();
      
      if (uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      } else {
        setSelectedDate("");
      }
    } else {
      setSelectedDate("");
    }
  }, [selectedYear, data]);

  console.log(data);

  // Extract dropdown options - memoized to prevent recalculation
  const divisions = useMemo(() => {
    const allDivisions = data.map((d) => d.division);
    return allDivisions.filter(div => 
      div && 
      div.trim() !== "" && 
      div !== "Unknown" && 
      div !== "अहमदनगर"
    );
  }, [data]);

  // Extract unique dates from all talukas - memoized
  const allDates = useMemo(() => {
    let filteredData = data.flatMap((div) =>
      div.districts.flatMap((dist) => dist.talukas)
    );
    
    // If year is selected, filter by that year first
    if (selectedYear) {
      filteredData = filteredData.filter((t) => t.year === selectedYear);
    }
    
    const dates = filteredData.map((t) => t.month);
    return [...new Set(dates)].filter(Boolean).sort();
  }, [data, selectedYear]);

  // Extract unique years from all talukas - memoized
  const allYears = useMemo(() => {
    const years = data.flatMap((div) =>
      div.districts.flatMap((dist) =>
        dist.talukas.map((t) => t.year)
      )
    );
    return [...new Set(years)].filter(Boolean).sort();
  }, [data]);

  const selectedDivisionObj = useMemo(
    () => data.find((d) => d.division === division),
    [data, division]
  );

  const districts = useMemo(
    () =>
      selectedDivisionObj
        ? selectedDivisionObj.districts.map((dist) => dist.district)
        : [],
    [selectedDivisionObj]
  );

  const selectedDistrictObj = useMemo(
    () =>
      selectedDivisionObj?.districts.find((dist) => dist.district === district),
    [selectedDivisionObj, district]
  );

  const talukas = useMemo(
    () =>
      selectedDistrictObj
        ? [...new Set(selectedDistrictObj.talukas.map((t) => t.taluka))]
        : [],
    [selectedDistrictObj]
  );

  // Collect filtered taluka data - memoized for performance
  const filteredTalukas = useMemo(() => {
    let baseFilteredTalukas = [];
    if (taluka) {
      baseFilteredTalukas =
        selectedDistrictObj?.talukas.filter((t) => t.taluka === taluka) || [];
    } else if (district) {
      baseFilteredTalukas = selectedDistrictObj?.talukas || [];
    } else if (division) {
      baseFilteredTalukas =
        selectedDivisionObj?.districts.flatMap((dist) => dist.talukas) || [];
    } else {
      baseFilteredTalukas = data.flatMap((div) =>
        div.districts.flatMap((dist) => dist.talukas)
      );
    }

    // Apply date filter if selected
    if (selectedDate) {
      baseFilteredTalukas = baseFilteredTalukas.filter((t) => t.month === selectedDate);
    }

    // Apply year filter if selected
    if (selectedYear) {
      baseFilteredTalukas = baseFilteredTalukas.filter((t) => t.year === selectedYear);
    }

    return baseFilteredTalukas;
  }, [
    data,
    division,
    district,
    taluka,
    selectedDate,
    selectedYear,
    selectedDivisionObj,
    selectedDistrictObj,
  ]);

  // ✅ KPI values - memoized for performance
  const kpiValues = useMemo(
    () => ({
      totalArea: filteredTalukas.reduce(
        (acc, t) => acc + (t.total_area_ha || 0),
        0
      ),
      totalDivisions: division ? 1 : data.length,
      totalDistricts: district
        ? 1
        : selectedDivisionObj
        ? selectedDivisionObj.districts.length
        : data.flatMap((d) => d.districts).length,
      totalTalukas: taluka ? 1 : filteredTalukas.length,
    }),
    [filteredTalukas, division, district, taluka, selectedYear, data, selectedDivisionObj]
  );

  // ✅ Pie chart data - shows districts by default, talukas when district is selected
  const districtData = useMemo(() => {
    // If no filtered data, return empty array but chart will still show
    if (!filteredTalukas || filteredTalukas.length === 0) {
      return [{ name: "No Data", total_area: 1 }];
    }

    if (district) {
      // When district is selected, show talukas in that district
      const talukaGroups = filteredTalukas.reduce((groups, taluka) => {
        const talukaName = taluka.taluka;
        if (!groups[talukaName]) {
          groups[talukaName] = [];
        }
        groups[talukaName].push(taluka);
        return groups;
      }, {});

      // Calculate totals for each taluka
      const result = Object.keys(talukaGroups).map((talukaName) => ({
        name: talukaName,
        total_area: talukaGroups[talukaName].reduce(
          (sum, t) => sum + (t.total_area_ha || 0),
          0
        ),
      }));

      // If all areas are zero, show placeholder data
      const hasValidData = result.some((d) => d.total_area > 0);
      if (!hasValidData) {
        return [{ name: "No Data Available", total_area: 1 }];
      }

      return result;
    } else {
      // Default behavior: show districts
      const districtGroups = filteredTalukas.reduce((groups, taluka) => {
        const district = taluka.district;
        if (!groups[district]) {
          groups[district] = [];
        }
        groups[district].push(taluka);
        return groups;
      }, {});

      // Calculate totals for each district
      const result = Object.keys(districtGroups).map((district) => ({
        name: district,
        total_area: districtGroups[district].reduce(
          (sum, t) => sum + (t.total_area_ha || 0),
          0
        ),
      }));

      // If all areas are zero, show placeholder data
      const hasValidData = result.some((d) => d.total_area > 0);
      if (!hasValidData) {
        return [{ name: "No Data Available", total_area: 1 }];
      }

      return result;
    }
  }, [filteredTalukas, district]);

  // ✅ Show divisions/districts with stacked agricultural metrics
  const barChartData = useMemo(() => {
    if (taluka) {
      // For taluka view, show the 4 metrics as separate bars
      const selectedTaluka = filteredTalukas[0];
      if (!selectedTaluka) return [];

      return [
        {
          name: "सुरु (हे.)",
          suru_ha: selectedTaluka.suru_ha || 0,
          color: "#82ca9d",
        },
        {
          name: "खोडवा (हे.)",
          ratoon_ha: selectedTaluka.ratoon_ha || 0,
          color: "#ffc658",
        },
        {
          name: "आडसाली (हे.)",
          adsali_ha: selectedTaluka.adsali_ha || 0,
          color: "#ff7300",
        },
        {
          name: "पूर्वहंगाम (हे.)",
          pre_season_ha: selectedTaluka.pre_season_ha || 0,
          color: "#00ff88",
        },
      ];
    } else if (district) {
      // For district view, show talukas with stacked metrics
      const talukaGroups = filteredTalukas.reduce((groups, taluka) => {
        const talukaName = taluka.taluka;
        if (!groups[talukaName]) {
          groups[talukaName] = [];
        }
        groups[talukaName].push(taluka);
        return groups;
      }, {});

      return Object.keys(talukaGroups)
        .map((talukaName) => {
          const talukaData = talukaGroups[talukaName];
          return {
            name: talukaName,
            suru_ha: talukaData.reduce(
              (sum, t) => sum + (t.suru_ha || 0),
              0
            ),
            ratoon_ha: talukaData.reduce(
              (sum, t) => sum + (t.ratoon_ha || 0),
              0
            ),
            adsali_ha: talukaData.reduce(
              (sum, t) => sum + (t.adsali_ha || 0),
              0
            ),
            pre_season_ha: talukaData.reduce(
              (sum, t) => sum + (t.pre_season_ha || 0),
              0
            ),
          };
        })
        .sort(
          (a, b) =>
            b.suru_ha + b.ratoon_ha + b.adsali_ha + b.pre_season_ha -
            (a.suru_ha + a.ratoon_ha + a.adsali_ha + a.pre_season_ha)
        );
    } else if (division) {
      // For division view, show districts with stacked metrics
      const districtGroups = filteredTalukas.reduce((groups, taluka) => {
        const districtName = taluka.district;
        if (!groups[districtName]) {
          groups[districtName] = [];
        }
        groups[districtName].push(taluka);
        return groups;
      }, {});

      return Object.keys(districtGroups)
        .map((districtName) => {
          const districtData = districtGroups[districtName];
          return {
            name: districtName,
            suru_ha: districtData.reduce(
              (sum, t) => sum + (t.suru_ha || 0),
              0
            ),
            ratoon_ha: districtData.reduce(
              (sum, t) => sum + (t.ratoon_ha || 0),
              0
            ),
            adsali_ha: districtData.reduce(
              (sum, t) => sum + (t.adsali_ha || 0),
              0
            ),
            pre_season_ha: districtData.reduce(
              (sum, t) => sum + (t.pre_season_ha || 0),
              0
            ),
          };
        })
        .sort(
          (a, b) =>
            b.suru_ha + b.ratoon_ha + b.adsali_ha + b.pre_season_ha -
            (a.suru_ha + a.ratoon_ha + a.adsali_ha + a.pre_season_ha)
        );
    } else {
      // For all divisions view, show divisions with stacked metrics
      const divisionGroups = filteredTalukas.reduce((groups, taluka) => {
        const divisionName = taluka.division;
        if (!groups[divisionName]) {
          groups[divisionName] = [];
        }
        groups[divisionName].push(taluka);
        return groups;
      }, {});

      return Object.keys(divisionGroups)
        .map((divisionName) => {
          const divisionData = divisionGroups[divisionName];
          return {
            name: divisionName,
            suru_ha: divisionData.reduce(
              (sum, t) => sum + (t.suru_ha || 0),
              0
            ),
            ratoon_ha: divisionData.reduce(
              (sum, t) => sum + (t.ratoon_ha || 0),
              0
            ),
            adsali_ha: divisionData.reduce(
              (sum, t) => sum + (t.adsali_ha || 0),
              0
            ),
            pre_season_ha: divisionData.reduce(
              (sum, t) => sum + (t.pre_season_ha || 0),
              0
            ),
          };
        })
        .sort(
          (a, b) =>
            b.suru_ha + b.ratoon_ha + b.adsali_ha + b.pre_season_ha -
            (a.suru_ha + a.ratoon_ha + a.adsali_ha + a.pre_season_ha)
        );
    }
  }, [taluka, district, division, filteredTalukas]);

  // ✅ Metric-specific bar chart data based on selected metric
  const metricBarChartData = useMemo(() => {
    let metricKey = "";
    let metricName = "";
    
    // Map selected metric to data key
    switch(selectedMetric) {
      case "सुरु (हे.)":
        metricKey = "suru_ha";
        metricName = "सुरु (हे.)";
        break;
      case "खोडवा (हे.)":
        metricKey = "ratoon_ha";
        metricName = "खोडवा (हे.)";
        break;
      case "आडसाली (हे.)":
        metricKey = "adsali_ha";
        metricName = "आडसाली (हे.)";
        break;
      case "पूर्वहंगाम (हे.)":
        metricKey = "pre_season_ha";
        metricName = "पूर्वहंगाम (हे.)";
        break;
      default:
        metricKey = "suru_ha";
        metricName = "सुरु (हे.)";
    }

    if (taluka) {
      // For taluka view, show the selected metric value for this taluka
      const selectedTaluka = filteredTalukas[0];
      if (!selectedTaluka) return [];

      return [
        {
          name: selectedTaluka.taluka,
          [metricKey]: selectedTaluka[metricKey] || 0,
          metricName: metricName,
        },
      ];
    } else if (district) {
      // For district view, show talukas with selected metric values
      const talukaGroups = filteredTalukas.reduce((groups, taluka) => {
        const talukaName = taluka.taluka;
        if (!groups[talukaName]) {
          groups[talukaName] = [];
        }
        groups[talukaName].push(taluka);
        return groups;
      }, {});

      return Object.keys(talukaGroups)
        .map((talukaName) => {
          const talukaData = talukaGroups[talukaName];
          return {
            name: talukaName,
            [metricKey]: talukaData.reduce(
              (sum, t) => sum + (t[metricKey] || 0),
              0
            ),
            metricName: metricName,
          };
        })
        .sort((a, b) => b[metricKey] - a[metricKey]);
    } else if (division) {
      // For division view, show districts with selected metric values
      const districtGroups = filteredTalukas.reduce((groups, taluka) => {
        const districtName = taluka.district;
        if (!groups[districtName]) {
          groups[districtName] = [];
        }
        groups[districtName].push(taluka);
        return groups;
      }, {});

      return Object.keys(districtGroups)
        .map((districtName) => {
          const districtData = districtGroups[districtName];
          return {
            name: districtName,
            [metricKey]: districtData.reduce(
              (sum, t) => sum + (t[metricKey] || 0),
              0
            ),
            metricName: metricName,
          };
        })
        .sort((a, b) => b[metricKey] - a[metricKey]);
    } else {
      // For all divisions view, show divisions with selected metric values
      const divisionGroups = filteredTalukas.reduce((groups, taluka) => {
        const divisionName = taluka.division;
        if (!groups[divisionName]) {
          groups[divisionName] = [];
        }
        groups[divisionName].push(taluka);
        return groups;
      }, {});

      return Object.keys(divisionGroups)
        .map((divisionName) => {
          const divisionData = divisionGroups[divisionName];
          return {
            name: divisionName,
            [metricKey]: divisionData.reduce(
              (sum, t) => sum + (t[metricKey] || 0),
              0
            ),
            metricName: metricName,
          };
        })
        .sort((a, b) => b[metricKey] - a[metricKey]);
    }
  }, [selectedMetric, taluka, district, division, filteredTalukas]);

  // ✅ Interactive Pie chart data with active shapes
  const renderActiveShape = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * (midAngle ?? 1));
    const cos = Math.cos(-RADIAN * (midAngle ?? 1));
    
    // Shorter line to keep tooltip closer to chart
    const sx = (cx ?? 0) + ((outerRadius ?? 0) + 8) * cos;
    const sy = (cy ?? 0) + ((outerRadius ?? 0) + 8) * sin;
    const mx = (cx ?? 0) + ((outerRadius ?? 0) + 20) * cos;
    const my = (cy ?? 0) + ((outerRadius ?? 0) + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={(outerRadius ?? 0) + 6}
          outerRadius={(outerRadius ?? 0) + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#333" fontSize="12">
          {`${value.toLocaleString()} Ha`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={16} textAnchor={textAnchor} fill="#999" fontSize="11">
          {`(${((percent ?? 1) * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  // ✅ Custom Tooltip for Pie Charts
  const CustomPieTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      // Calculate total from all segments in this specific chart
      const total = payload.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      
      return (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "12px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            fontSize: "14px",
            fontWeight: "500",
            color: "#333",
            minWidth: "200px",
          }}
        >
          <div style={{ marginBottom: "8px", fontWeight: "600", color: "#1e40af" }}>
            {data.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: data.payload.fill,
                borderRadius: "50%",
              }}
            />
            <span style={{ color: "#666" }}>Area:</span>
            <span style={{ fontWeight: "600", color: "#1e40af" }}>
              {data.value.toLocaleString()} हेक्टर
            </span>
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
            Percentage: {percentage}%
          </div>
        </div>
      );
    }
    return null;
  };

  // ✅ Custom Legend for Bar Chart
  const CustomLegend = ({ payload }) => {
    return (
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", marginTop: "16px" }}>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: entry.color,
                borderRadius: "2px",
              }}
            />
            <span style={{ color: "#000", fontSize: "12px", fontWeight: "600" }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ✅ Login Page Component
  const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const handleLogin = (e) => {
      e.preventDefault();
      // Static login credentials
      if (username === "sugar" && password === "sugar123") {
        setIsLoggedIn(true);
        setLoginError("");
      } else {
        setLoginError("Invalid username or password");
      }
    };

    return (
      <div
        className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "20px" }}
      >
        <div
          className="p-8 max-w-md w-full mx-4"
          style={{
            background: "rgba(255, 255, 255, 0.25)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="text-center mb-8">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: "#1e40af" }}
            >
               Maharashtra Sugarcane Status
            </h2>
            <p className="text-gray-600">Please login to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Login
            </button>
          </form>

          {/* <div className="mt-6 text-center text-sm text-gray-500">
            <p>Demo Credentials:</p>
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> admin123</p>
          </div> */}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (loading) return <div className="p-4">Loading data...</div>;

  return (
    <div
      className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50"
      style={{ display: "flex", justifyContent: "center",borderRadius: "20px" }}
    >
      <div
        className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-x-hidden"
        style={{
          width: "90%",
          minWidth: "90vw",
          maxWidth: "90vw",
          flexShrink: 0,
          // margin: "10px auto",
          background: "rgba(255, 255, 255, 0.25)",
          backdropFilter: "blur(20px)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow:
            "0 25px 50px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Header with User Info and Logout */}
        <div
          className="flex justify-between items-center mb-3 p-3 rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.22)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h2
            className="text-lg sm:text-xl lg:text-2xl font-bold"
            style={{ color: "#1e40af" , fontWeight: "bold" ,marginLeft: "20%" }}
          >
             Maharashtra Sugarcane Status (Predicted)
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
              >
                A
              </div>
              <span className="text-sm font-medium text-gray-700">
                Welcome, Admin
              </span>
            </div>
            
            <button
              onClick={() => setIsLoggedIn(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div
          className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 p-3 rounded-xl justify-center items-center"
          style={{
            background: "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.1)",
          }}
        >


           {/* Year */} {/* Year */}
           <div className="w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
             <label className="block text-xs sm:text-sm font-medium mb-1">
             हंगाम
             </label>
             <select
               className="w-full border rounded p-2 text-sm sm:text-base min-w-0"
               value={selectedYear}
               onChange={(e) => setSelectedYear(e.target.value)}
             >
               {allYears.map((year, i) => (
                 <option key={i} value={year}>
                   {year}
                 </option>
               ))}
             </select>
           </div>
          {/* Date Filter */}
          <div className="w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
            <label className="block text-xs sm:text-sm font-medium mb-1">
            तारीख
            </label>
             <select
               className="w-full border rounded p-2 text-sm sm:text-base min-w-0"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
             >
              {allDates.map((date, i) => (
                <option key={i} value={date}>
                  {date}
                </option>
              ))}
             </select>
          </div>

          {/* Division */}
          <div className="w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
            <label className="block text-xs sm:text-sm font-medium mb-1">
             विभाग
            </label>
            <select
              className="w-full border rounded p-2 text-sm sm:text-base min-w-0"
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setDistrict("");
                setTaluka("");
              }}
            >
              <option value="">All</option>
              {divisions.map((div, i) => (
                <option key={i} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
            <label className="block text-xs sm:text-sm font-medium mb-1">
            जिल्हा
            </label>
            <select
              className="w-full border rounded p-2 text-sm sm:text-base min-w-0"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setTaluka("");
              }}
              disabled={!division}
            >
              <option value="">All</option>
              {districts.map((dist, i) => (
                <option key={i} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Taluka */}
          <div className="w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
            <label className="block text-xs sm:text-sm font-medium mb-1">
            तहसील
            </label>
            <select
              className="w-full border rounded p-2 text-sm sm:text-base min-w-0"
              value={taluka}
              onChange={(e) => setTaluka(e.target.value)}
              disabled={!district}
            >
              <option value="">All</option>
              {talukas.map((t, i) => (
                <option key={i} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          
        </div>

                 {/* KPI Cards */}
         <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
          <div
            className="p-2 sm:p-3 rounded-xl text-center transition-all duration-300 hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 197, 253, 0.1) 100%)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.2)",
            }}
          >
            <h2 className="text-xs sm:text-sm font-semibold text-blue-800 mb-1">
            एकूण क्षेत्र(हे.)
            </h2>
            <p className="text-sm sm:text-lg font-bold text-blue-900 break-words">
              {Math.round(kpiValues.totalArea).toLocaleString()}
            </p>
          </div>

          <div
            className="p-2 sm:p-3 rounded-xl text-center transition-all duration-300 hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(134, 239, 172, 0.1) 100%)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              boxShadow: "0 8px 32px rgba(34, 197, 94, 0.2)",
            }}
          >
            <h2 className="text-xs sm:text-sm font-semibold text-green-800 mb-1">
            विभाग
            </h2>
            <p className="text-sm sm:text-lg font-bold text-green-900">
              {kpiValues.totalDivisions}
            </p>
          </div>

          <div
            className="p-2 sm:p-3 rounded-xl text-center transition-all duration-300 hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(252, 211, 77, 0.1) 100%)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              boxShadow: "0 8px 32px rgba(245, 158, 11, 0.2)",
            }}
          >
            <h2 className="text-xs sm:text-sm font-semibold text-yellow-800 mb-1">
            जिल्हा
            </h2>
            <p className="text-sm sm:text-lg font-bold text-yellow-900">
              {kpiValues.totalDistricts}
            </p>
          </div>

            <div
             className="p-2 sm:p-3 rounded-xl text-center transition-all duration-300 hover:scale-105"
             style={{
               background:
                 "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(196, 181, 253, 0.1) 100%)",
               backdropFilter: "blur(15px)",
               border: "1px solid rgba(147, 51, 234, 0.3)",
               boxShadow: "0 8px 32px rgba(147, 51, 234, 0.2)",
             }}
           >
             <h2 className="text-xs sm:text-sm font-semibold text-purple-800 mb-1">
              तहसील
             </h2>
             <p className="text-sm sm:text-lg font-bold text-purple-900">
               {kpiValues.totalTalukas}
             </p>
           </div>

           {/* New Galap Hangam KPI Card */}
           <div
             className="p-2 sm:p-3 rounded-xl text-center transition-all duration-300 hover:scale-105"
             style={{
               background:
                 "linear-gradient(135deg, rgba(243, 73, 73, 0.2) 0%, rgba(246, 79, 76, 0.1) 100%)",
               backdropFilter: "blur(15px)",
               border: "1px solid rgba(247, 85, 85, 0.3)",
               boxShadow: "0 8px 32px rgba(249, 94, 55, 0.2)",
             }}
           >
             <h2 className="text-xs sm:text-sm font-semibold text-purple-800 mb-1">
              पुढील गाळप हंगाम (हे.)
             </h2>
             <p className="text-sm sm:text-lg font-bold text-purple-900">
               {Math.round(filteredTalukas
                 .reduce((sum, t) => sum + (t.season_2025_26 || 0), 0))
                 .toLocaleString()}
             </p>
           </div>
         </div>

                 {/* Agricultural Metrics Grid */}
         <div
           className="w-full rounded-xl p-3 sm:p-4"
           style={{
             background: "rgba(255, 255, 255, 0.3)",
             backdropFilter: "blur(15px)",
             border: "1px solid rgba(255, 255, 255, 0.4)",
             boxShadow: "0 12px 32px rgba(0, 0, 0, 0.1)",
           }}
         >
           <h3
             className="text-base sm:text-lg font-bold mb-3 text-center text-gray-800"
             style={{
               background: "rgba(255, 255, 255, 0.4)",
               backdropFilter: "blur(10px)",
               padding: "8px 16px",
               borderRadius: "12px",
               border: "1px solid rgba(255, 255, 255, 0.5)",
             }}
           >
             🌾 ऊस सांख्यिकी 
           </h3>
           <div
             className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-2"
             style={{ width: "100%" }}
           >
             {/* Row 1 */}
             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.estimated_area_ha || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 उर्वरित क्षेत्र (हे.)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.suru_ha || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 सुरु (हे.)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.ratoon_ha || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 खोडवा (हे.)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.adsali_ha || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 आडसाली (हे.)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.pre_season_ha || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 पूर्वहंगाम (हे.)
               </div>
             </div>

             {/* Row 2 */}
             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {filteredTalukas
                   .reduce((sum, t) => sum + (t.harvested_area_ha || 0), 0)
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 एकूण तोडलेले क्षेत्र (हे.)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {(() => {
                   if (filteredTalukas.length === 0) return "0.00";
                   
                   if (!division) {
                     // No division selected: Return hardcoded value for २०२५-२०२६, actual for others
                     if (selectedYear === "२०२५-२०२६") {
                       return "0.84";
                     } else {
                       const validMoistures = filteredTalukas
                         .map(t => parseFloat(t.soil_moisture_percent) || 0)
                         .filter(val => val > 0);
                       
                       return validMoistures.length > 0 
                         ? (validMoistures.reduce((sum, val) => sum + val, 0) / validMoistures.length).toFixed(2)
                         : "0.00";
                     }
                   } 
                   else if (!district) {
                     // Division selected: Return hardcoded values for २०२५-२०२६, actual for others
                     if (selectedYear === "२०२५-२०२६") {
                       const divisionValues = {
                         "कोल्हापूर": "0.75",
                         "पुणे": "0.87",
                         "सोलापूर": "0.87",
                         "अहिल्यानगर": "0.83",
                         "छ .संभाजीनगर": "0.84",
                         "नांदेड": "0.82",
                         "अमरावती": "0.78",
                         "नागपूर": "0.80"
                       };
                       
                       return divisionValues[division] || "0.00";
                     } else {
                       const validMoistures = filteredTalukas
                         .map(t => parseFloat(t.soil_moisture_percent) || 0)
                         .filter(val => val > 0);
                       
                       return validMoistures.length > 0 
                         ? (validMoistures.reduce((sum, val) => sum + val, 0) / validMoistures.length).toFixed(2)
                         : "0.00";
                     }
                   }
                   else {
                     // District selected: Simple average of all valid soil moisture values in that district
                     const validMoistures = filteredTalukas
                       .map(t => parseFloat(t.soil_moisture_percent) || 0)
                       .filter(val => val > 0);
                     
                     return validMoistures.length > 0 
                       ? (validMoistures.reduce((sum, val) => sum + val, 0) / validMoistures.length).toFixed(2)
                       : "0.00";
                   }
                 })()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 मातीचा ओलावा(%)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {filteredTalukas.length > 0
                   ? (
                       filteredTalukas.reduce(
                         (sum, t) => sum + (t.sugar_recovery_percent || 0),
                         0
                       ) /
                         filteredTalukas.filter((t) => t.sugar_recovery_percent)
                           .length || 0
                     ).toFixed(2)
                   : 0}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 साखर उतारा (%)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {(() => {
                   if (filteredTalukas.length === 0) return "0.00";
                   
                   if (!division) {
                     // No division selected: Return hardcoded value for २०२५-२०२६, actual for others
                     if (selectedYear === "२०२५-२०२६") {
                       return "78.71";
                     } else {
                       const validProductivities = filteredTalukas
                         .map(t => parseFloat(t.productivity_tons_per_ha) || 0)
                         .filter(val => val > 0);
                       
                       return validProductivities.length > 0 
                         ? (validProductivities.reduce((sum, val) => sum + val, 0) / validProductivities.length).toFixed(2)
                         : "0.00";
                     }
                   } 
                   else if (!district) {
                     // Division selected: Return hardcoded values for २०२५-२०२६, actual for others
                     if (selectedYear === "२०२५-२०२६") {
                       const divisionValues = {
                         "कोल्हापूर": "86.04",
                         "पुणे": "82.92",
                         "सोलापूर": "86.03",
                         "अहिल्यानगर": "78.79",
                         "छ .संभाजीनगर": "83.91",
                         "नांदेड": "83.97",
                         "अमरावती": "62.60",
                         "नागपूर": "65.44"
                       };
                       
                       return divisionValues[division] || "0.00";
                     } else {
                       const validProductivities = filteredTalukas
                         .map(t => parseFloat(t.productivity_tons_per_ha) || 0)
                         .filter(val => val > 0);
                       
                       return validProductivities.length > 0 
                         ? (validProductivities.reduce((sum, val) => sum + val, 0) / validProductivities.length).toFixed(2)
                         : "0.00";
                     }
                   }
                   else {
                     // District selected: Simple average of all valid productivity values in that district
                     const validProductivities = filteredTalukas
                       .map(t => parseFloat(t.productivity_tons_per_ha) || 0)
                       .filter(val => val > 0);
                     
                     return validProductivities.length > 0 
                       ? (validProductivities.reduce((sum, val) => sum + val, 0) / validProductivities.length).toFixed(2)
                       : 0;
                   }
                 })()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 उत्पादकता (टन/हे)
               </div>
             </div>

             <div
               className="rounded-lg p-2 sm:p-3 text-center transition-all duration-300 hover:scale-105"
               style={{
                 background:
                   "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)",
                 backdropFilter: "blur(15px)",
                 border: "1px solid rgba(6, 182, 212, 0.3)",
                 boxShadow: "0 8px 32px rgba(6, 182, 212, 0.2)",
               }}
             >
               <div className="text-sm sm:text-base font-bold text-cyan-900 break-words">
                 {Math.round(filteredTalukas
                   .reduce((sum, t) => sum + (t.production_tons || 0), 0))
                   .toLocaleString()}
               </div>
               <div className="text-xs text-cyan-800 mt-1 leading-tight font-medium">
                 उत्पादन (टन)
               </div>
             </div>
           </div>
         </div>

         {/* Bar Chart - Full Width */}
         <div
          className="rounded-xl p-3 sm:p-4"
          style={{
            background: "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h2
            className="text-base sm:text-lg font-bold mb-2 text-center break-words text-gray-800"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(10px)",
              padding: "8px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.5)",
            }}
          >
            {taluka
              ? `${taluka} - मीट्रिक्स`
              : district
              ? `तहसील ${district} जिल्हा`
              : division
              ? `जिल्हा ${division} विभाग`
              : "लागवडी निहाय ऊस क्षेत्र"} 
          </h2>
          <div style={{ width: "100%", height: "250px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                animationBegin={0}
                animationDuration={0}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    `${value.toLocaleString()} ${
                      name === "production_tons" ? "Tons" : "Ha"
                    }`,
                    name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                  ]}
                />
                <Legend content={<CustomLegend />} />

                {taluka ? (
                  // For taluka view, show 4 separate bars
                  <>
                    <Bar
                      dataKey="suru_ha"
                      fill="#82ca9d"
                      name="सुरु (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="ratoon_ha"
                      fill="#ffc658"
                      name="खोडवा (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="adsali_ha"
                      fill="#ff7300"
                      name="आडसाली (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="pre_season_ha"
                      fill="#00ff88"
                      name="पूर्वहंगाम (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                  </>
                ) : (
                  // For division/district view, show stacked bars
                  <>
                    <Bar
                      dataKey="suru_ha"
                      fill="#82ca9d"
                      name="सुरु (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="ratoon_ha"
                      fill="#ffc658"
                      name="खोडवा (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="adsali_ha"
                      fill="#ff7300"
                      name="आडसाली (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                    <Bar
                      dataKey="pre_season_ha"
                      fill="#00ff88"
                      name="पूर्वहंगाम (हे.)"
                      stackId="a"
                      isAnimationActive={true}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agricultural Metrics Selection Buttons and Chart */}
        <div
             className="rounded-xl p-3 sm:p-4"
             style={{
               background: "rgba(255, 255, 255, 0.3)",
               backdropFilter: "blur(15px)",
               border: "1px solid rgba(255, 255, 255, 0.4)",
               boxShadow: "0 12px 32px rgba(0, 0, 0, 0.1)",
             }}
           >
             <h3
               className="text-base sm:text-lg font-bold mb-4 text-center text-gray-800"
               style={{
                 background: "rgba(255, 255, 255, 0.4)",
                 backdropFilter: "blur(10px)",
                 padding: "8px 16px",
                 borderRadius: "12px",
                 border: "1px solid rgba(255, 255, 255, 0.5)",
               }}
             >
               🌾 क्षेत्र निहाय उपलब्ध ऊस 
             </h3>
             
             {/* Metric Selection Buttons */}
              <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-4">
               {["सुरु (हे.)", "खोडवा (हे.)", "आडसाली (हे.)", "पूर्वहंगाम (हे.)"].map((metric) => {
                 const getButtonColor = (metric) => {
                   switch(metric) {
                     case "सुरु (हे.)":
                       return selectedMetric === metric ? "#82ca9d" : "#e8f5e8";
                     case "खोडवा (हे.)":
                       return selectedMetric === metric ? "#ffc658" : "#fff8e1";
                     case "आडसाली (हे.)":
                       return selectedMetric === metric ? "#ff7300" : "#fff3e0";
                     case "पूर्वहंगाम (हे.)":
                       return selectedMetric === metric ? "#775DD0" : "#f3e5f5";
                     default:
                       return selectedMetric === metric ? "#82ca9d" : "#e8f5e8";
                   }
                 };
                 
                 return (
                 <button
                   key={metric}
                   onClick={() => setSelectedMetric(metric)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                      selectedMetric === metric
                        ? "text-white shadow-lg transform scale-105"
                        : "text-gray-700 hover:opacity-80 shadow-md hover:shadow-lg"
                    }`}
             style={{
                     backgroundColor: getButtonColor(metric),
                     border: selectedMetric === metric ? `2px solid ${getButtonColor(metric)}` : "1px solid #e5e7eb",
                   }}
                 >
                   {metric}
                 </button>
               );
               })}
           </div>

             {/* Bar Chart */}
             <div style={{ width: "100%", height: "300px" }}>
                   <ResponsiveContainer width="100%" height="100%">
                 <BarChart
                   data={metricBarChartData}
                   animationBegin={0}
                   animationDuration={500}
                 >
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis
                     dataKey="name"
                     angle={-45}
                     textAnchor="end"
                     height={80}
                     interval={0}
                     tick={{ fontSize: 10 }}
                   />
                   <YAxis />
                   <Tooltip
                     formatter={(value, name) => [
                       `${value.toLocaleString()} हेक्टर`,
                       selectedMetric,
                     ]}
                   />
                   <Bar
                     dataKey={selectedMetric === "सुरु (हे.)" ? "suru_ha" : 
                             selectedMetric === "खोडवा (हे.)" ? "ratoon_ha" :
                             selectedMetric === "आडसाली (हे.)" ? "adsali_ha" : "pre_season_ha"}
                     fill={
                       selectedMetric === "सुरु (हे.)" ? "#82ca9d" :
                       selectedMetric === "खोडवा (हे.)" ? "#ffc658" :
                       selectedMetric === "आडसाली (हे.)" ? "#ff7300" : "#775DD0"
                     }
                     name={selectedMetric}
                     isAnimationActive={true}
                   />
                 </BarChart>
                   </ResponsiveContainer>
            </div>
         </div>

         {/* Disclaimer */}
         <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
           <div className="flex items-start">
             <div className="flex-shrink-0">
               <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="ml-3">
               <p className="text-sm text-yellow-700">
                 <strong>Disclaimer:</strong> This information is created using AI/ML technology. Based on data and observations, results can vary time to time.
               </p>
             </div>
           </div>
         </div>

       
      </div>
    </div>
  );
}


