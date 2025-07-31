import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";

// Auth Screens
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";

// Main Screens
import DashboardScreen from "./src/screens/main/DashboardScreen";
import CasesScreen from "./src/screens/main/CasesScreen";
import ClientsScreen from "./src/screens/main/ClientsScreen";
import CalendarScreen from "./src/screens/main/CalendarScreen";
import TasksScreen from "./src/screens/main/TasksScreen";
import DocumentsScreen from "./src/screens/main/DocumentsScreen";
import BillingScreen from "./src/screens/main/BillingScreen";
import NotificationsScreen from "./src/screens/main/NotificationsScreen";
import ProfileScreen from "./src/screens/main/ProfileScreen";

// Case Screens
import CaseDetailScreen from "./src/screens/cases/CaseDetailScreen";
import CreateCaseScreen from "./src/screens/cases/CreateCaseScreen";
import CaseNotesScreen from "./src/screens/cases/CaseNotesScreen";

// Client Screens
import ClientDetailScreen from "./src/screens/clients/ClientDetailScreen";

// Document Screens
import DocumentDetailScreen from "./src/screens/documents/DocumentDetailScreen";
import UploadDocumentScreen from "./src/screens/documents/UploadDocumentScreen";

// Billing Screens
import BillingDetailScreen from "./src/screens/billing/BillingDetailScreen";
import CreateBillScreen from "./src/screens/billing/CreateBillScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Cases"
        component={CasesScreen}
        options={{
          title: "Cases",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="briefcase" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="users" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="check-square" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          title: "Documents",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="file-text" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          title: "Billing",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="credit-card" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="notifications" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Tab Icon Component
function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  const iconMap: { [key: string]: string } = {
    home: "🏠",
    briefcase: "💼",
    users: "👥",
    calendar: "📅",
    "check-square": "✅",
    "file-text": "📄",
    "credit-card": "💳",
    notifications: "🔔",
  };

  return <span style={{ fontSize: size, color }}>{iconMap[name] || "📱"}</span>;
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="CaseDetail"
        component={CaseDetailScreen}
        options={{ title: "Case Details" }}
      />
      <Stack.Screen
        name="CreateCase"
        component={CreateCaseScreen}
        options={{ title: "Create Case" }}
      />
      <Stack.Screen
        name="CaseNotes"
        component={CaseNotesScreen}
        options={{ title: "Case Notes" }}
      />
      <Stack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{ title: "Client Details" }}
      />
      <Stack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={{ title: "Document Details" }}
      />
      <Stack.Screen
        name="UploadDocument"
        component={UploadDocumentScreen}
        options={{ title: "Upload Document" }}
      />
      <Stack.Screen
        name="BillingDetail"
        component={BillingDetailScreen}
        options={{ title: "Billing Details" }}
      />
      <Stack.Screen
        name="CreateBill"
        component={CreateBillScreen}
        options={{ title: "Create Bill" }}
      />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
