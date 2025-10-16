import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const YearComparison = ({ data, selectedDivision, selectedDistrict, selectedTaluka }) => {
  // Flatten the nested data structure and apply filters
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Flatten the nested structure: divisions -> districts -> talukas
    const flattenedData = data.flatMap(div => 
      div.districts.flatMap(dist => 
        dist.talukas.map(taluka => ({
          ...taluka,
          division: div.division,
          district: dist.district
        }))
      )
    );
    
    // Apply filters
    return flattenedData.filter(item => {
      if (selectedDivision && item.division !== selectedDivision) return false;
      if (selectedDistrict && item.district !== selectedDistrict) return false;
      if (selectedTaluka && item.taluka !== selectedTaluka) return false;
      return true;
    });
  }, [data, selectedDivision, selectedDistrict, selectedTaluka]);

  // Calculate comparison data for August months
  const comparisonData = useMemo(() => {
    const august2024 = filteredData.filter(item => item.month === "ऑगस्ट २०२४");
    const august2025 = filteredData.filter(item => item.month === "ऑगस्ट २०२५");

    const calculateMetric = (monthData, metric) => {
      if (monthData.length === 0) return 0;
      
      const validValues = monthData
        .map(item => parseFloat(item[metric]) || 0)
        .filter(val => val > 0);
      
      return validValues.length > 0 
        ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length
        : 0;
    };

    const calculateTotal = (monthData, metric) => {
      return monthData.reduce((sum, item) => sum + (parseFloat(item[metric]) || 0), 0);
    };

    const result = [
      {
        metric: "उत्पादकता (टन/हे)",
        "३१ ऑगस्ट २०२४": calculateMetric(august2024, "productivity_tons_per_ha"),
        "३१ ऑगस्ट २०२५": calculateMetric(august2025, "productivity_tons_per_ha")
      },
      {
        metric: "मातीचा आर्द्रता(%)",
        "३१ ऑगस्ट २०२४": calculateMetric(august2024, "soil_moisture_percent"),
        "३१ ऑगस्ट २०२५": calculateMetric(august2025, "soil_moisture_percent")
      },
      {
        metric: "साखर उतारा (%)",
        "३१ ऑगस्ट २०२४": calculateMetric(august2024, "sugar_recovery_percent"),
        "३१ ऑगस्ट २०२५": calculateMetric(august2025, "sugar_recovery_percent")
      },
      {
        metric: "उत्पादन (टन)",
        "३१ ऑगस्ट २०२४": Math.round(calculateTotal(august2024, "production_tons")),
        "३१ ऑगस्ट २०२५": Math.round(calculateTotal(august2025, "production_tons"))
      },
      {
        metric: "एकूण क्षेत्र (हे.)",
        "३१ ऑगस्ट २०२४": Math.round(calculateTotal(august2024, "estimated_area_ha")),
        "३१ ऑगस्ट २०२५": Math.round(calculateTotal(august2025, "estimated_area_ha"))
      }
    ];
    
    return result;
  }, [filteredData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          महिना तुलना (३१ ऑगस्ट २०२४ vs ३१ ऑगस्ट २०२५)
        </h3>
        <p className="text-sm text-gray-600">
          {selectedDivision && `विभाग: ${selectedDivision}`}
          {selectedDistrict && ` | जिल्हा: ${selectedDistrict}`}
          {selectedTaluka && ` | तहसील: ${selectedTaluka}`}
        </p>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="metric" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar 
              dataKey="३१ ऑगस्ट २०२४" 
              fill="#3b82f6" 
              name="३१ ऑगस्ट २०२४"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="३१ ऑगस्ट २०२५" 
              fill="#10b981" 
              name="३१ ऑगस्ट २०२५"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">३१ ऑगस्ट २०२४ सारांश</h4>
          <div className="space-y-1 text-sm">
            <p>सरासरी उत्पादकता: {comparisonData[0]["३१ ऑगस्ट २०२४"].toFixed(2)} टन/हे</p>
            <p>सरासरी मातीचा आर्द्रता: {comparisonData[1]["३१ ऑगस्ट २०२४"].toFixed(2)}%</p>
            <p>एकूण उत्पादन: {comparisonData[3]["३१ ऑगस्ट २०२४"].toLocaleString()} टन</p>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">३१ ऑगस्ट २०२५ सारांश</h4>
          <div className="space-y-1 text-sm">
            <p>सरासरी उत्पादकता: {comparisonData[0]["३१ ऑगस्ट २०२५"].toFixed(2)} टन/हे</p>
            <p>सरासरी मातीचा आर्द्रता: {comparisonData[1]["३१ ऑगस्ट २०२५"].toFixed(2)}%</p>
            <p>एकूण उत्पादन: {comparisonData[3]["३१ ऑगस्ट २०२५"].toLocaleString()} टन</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearComparison;
