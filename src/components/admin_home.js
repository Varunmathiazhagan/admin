import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { Box, ShoppingCart, Users, MessageSquare, BarChart2, Settings, Package, 
         AlertTriangle, TrendingUp, ChevronRight, RefreshCw, ArrowUp, ArrowDown,
         Moon, Sun, Calendar, Bell, HelpCircle, Clock, CheckSquare, FileText,
         Zap, Activity, Edit3, PieChart, Filter, Archive, User, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Generate sample data for sparklines
const generateSparklineData = (baseline, variance, points = 12) => {
    return Array.from({length: points}, () => baseline + (Math.random() * variance * 2 - variance));
};

const AdminHome = () => {
    const [products, setProducts] = useState(null);
    const [contacts, setContacts] = useState(null);
    const [users, setUsers] = useState(null);
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState(null);
    const [contactsError, setContactsError] = useState(null);
    const [usersError, setUsersError] = useState(null);
    const [ordersError, setOrdersError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [userRetryCount, setUserRetryCount] = useState(0);
    const [orderRetryCount, setOrderRetryCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [recentActivities, setRecentActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [activitiesError, setActivitiesError] = useState(null);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [taskError, setTaskError] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]); // For stock management
    
    // Add missing state for task modal
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        priority: 'medium',
        due: new Date().toISOString().split('T')[0]
    });
    
    // Historical data comparison and performance metrics - Add missing states
    const [previousMonthOrders, setPreviousMonthOrders] = useState(null);
    const [previousMonthUsers, setPreviousMonthUsers] = useState(null); // Added missing state
    const [previousMonthRatings, setPreviousMonthRatings] = useState(null); // Added missing state
    const [performanceMetrics, setPerformanceMetrics] = useState({ // Added missing state
        salesGrowth: { value: 0, change: 0 },
        customerRetention: { value: 0, change: 0 },
        avgRating: { value: 0, change: 0 }
    });
    const [loadingMetrics, setLoadingMetrics] = useState(true); // Added missing state
    const [metricsError, setMetricsError] = useState(null);
    
    const [upcomingEvents, setUpcomingEvents] = useState([
        { id: 1, title: 'Marketing Campaign Launch', date: '2023-10-01', type: 'marketing' },
        { id: 2, title: 'Inventory Audit', date: '2023-10-15', type: 'inventory' },
        { id: 3, title: 'Staff Meeting', date: '2023-09-30', type: 'internal' },
        { id: 4, title: 'New Product Launch', date: '2023-10-20', type: 'product' },
    ]);

    // Define sparkline trends for stats
    const statTrends = {
        products: {
            data: generateSparklineData(15, 5),
            isUp: true
        },
        users: {
            data: generateSparklineData(25, 8),
            isUp: true
        },
        messages: {
            data: generateSparklineData(10, 4),
            isUp: false
        },
        orders: {
            data: generateSparklineData(30, 10),
            isUp: true
        },
        revenue: {
            data: generateSparklineData(50, 15),
            isUp: true
        },
        tasks: {
            data: generateSparklineData(20, 7),
            isUp: true
        },
        stockAlerts: {
            data: generateSparklineData(12, 4),
            isUp: false
        }
    };

    // Get current time to display greeting
    const currentHour = new Date().getHours();
    let greeting = "Good morning";
    if (currentHour >= 12 && currentHour < 17) {
        greeting = "Good afternoon";
    } else if (currentHour >= 17) {
        greeting = "Good evening";
    }

    useEffect(() => {
        loadDashboardData();
        loadContactsData();
        loadUsersData();
        loadOrdersData();
        loadHistoricalData();
        loadPendingTasks();
        loadRecentActivities(); // Fetch recent activities on component mount
        loadLowStockProducts(); // Fetch low stock products
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('adminDarkMode');
        if (savedTheme === 'true') {
            setDarkMode(true);
            document.body.classList.add('dark-mode');
        }
    }, []);

    useEffect(() => {
        if (orders && previousMonthOrders && users && previousMonthUsers && previousMonthRatings) {
            calculatePerformanceMetrics();
        }
    }, [orders, previousMonthOrders, users, previousMonthUsers, previousMonthRatings]);
    
    const loadHistoricalData = async () => {
        setLoadingMetrics(true);
        setMetricsError(null);
        try {
            // Calculate date ranges for previous month
            const now = new Date();
            const currentMonth = now.getMonth();
            const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const currentYear = now.getFullYear();
            const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            const startDate = new Date(previousMonthYear, previousMonth, 1).toISOString();
            const endDate = new Date(currentYear, currentMonth, 0).toISOString();
            
            // Try to get historical orders data first
            try {
                const ordersResponse = await fetch(`http://localhost:5008/api/orders/admin/all?startDate=${startDate}&endDate=${endDate}`);
                if (ordersResponse.ok) {
                    const ordersData = await ordersResponse.json();
                    if (ordersData.success && Array.isArray(ordersData.orders)) {
                        // Filter orders based on date range since the endpoint might not handle filtering
                        const filteredOrders = ordersData.orders.filter(order => {
                            const orderDate = new Date(order.createdAt);
                            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
                        });
                        setPreviousMonthOrders(filteredOrders);
                    } else {
                        console.warn('Historical orders endpoint returned unexpected format, using orders data');
                        // Default to all orders as fallback
                        setPreviousMonthOrders(generateFallbackOrdersData(20));
                    }
                } else {
                    console.warn('Historical orders endpoint failed, using fallback data');
                    setPreviousMonthOrders(generateFallbackOrdersData(20));
                }
            } catch (error) {
                console.warn('Error fetching historical orders:', error);
                setPreviousMonthOrders(generateFallbackOrdersData(20));
            }
            
            // Try to get historical users data
            try {
                const usersResponse = await fetch(`http://localhost:5008/api/users`);
                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    if (Array.isArray(usersData)) {
                        // Filter users based on creation date
                        const filteredUsers = usersData.filter(user => {
                            if (!user.createdAt) return false;
                            const creationDate = new Date(user.createdAt);
                            return creationDate >= new Date(startDate) && creationDate <= new Date(endDate);
                        });
                        setPreviousMonthUsers(filteredUsers);
                    } else {
                        console.warn('Users endpoint returned unexpected format, using fallback data');
                        setPreviousMonthUsers(generateFallbackUsersData(15));
                    }
                } else {
                    console.warn('Users endpoint failed, using fallback data');
                    setPreviousMonthUsers(generateFallbackUsersData(15));
                }
            } catch (error) {
                console.warn('Error fetching historical users:', error);
                setPreviousMonthUsers(generateFallbackUsersData(15));
            }
            
            // For ratings, we'll create fallback data since there's no dedicated endpoint
            setPreviousMonthRatings(generateFallbackRatingsData(30));
            
        } catch (error) {
            console.error("Error loading historical data:", error);
            setMetricsError("Failed to load historical data for comparison.");
            // Set fallback data
            setPreviousMonthOrders(generateFallbackOrdersData(20));
            setPreviousMonthUsers(generateFallbackUsersData(15));
            setPreviousMonthRatings(generateFallbackRatingsData(30));
        } finally {
            setLoadingMetrics(false);
        }
    };
    
    // Generate fallback data for calculations when API endpoints don't exist
    const generateFallbackOrdersData = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            totalPrice: Math.floor(Math.random() * 500) + 50,
            rating: Math.floor(Math.random() * 5) + 1,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
        }));
    };
    
    const generateFallbackUsersData = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            _id: `fallback_user_${i}`,
            email: `user${i}@example.com`,
            name: `User ${i}`,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
        }));
    };
    
    const generateFallbackRatingsData = (count) => {
        return Array.from({ length: count }, () => Math.floor(Math.random() * 5) + 1);
    };
    
    const calculatePerformanceMetrics = () => {
        try {
            const currentOrdersList = Array.isArray(orders) ? orders : 
                                     (orders && orders.orders && Array.isArray(orders.orders)) ? orders.orders : [];
            const previousOrdersList = Array.isArray(previousMonthOrders) ? previousMonthOrders : 
                                      (previousMonthOrders && previousMonthOrders.orders && Array.isArray(previousMonthOrders.orders)) ? previousMonthOrders.orders : [];
            
            const currentRevenue = currentOrdersList.reduce((total, order) => total + (Number(order.totalPrice) || 0), 0);
            const previousRevenue = previousOrdersList.reduce((total, order) => total + (Number(order.totalPrice) || 0), 0);
            
            const salesGrowthPercentage = previousRevenue > 0 ? 
                ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
                currentRevenue > 0 ? 100 : 0;
            
            const previousGrowthRate = 12.2;
            const growthRateChange = salesGrowthPercentage - previousGrowthRate;
            
            const currentUsersList = Array.isArray(users) ? users : [];
            const previousUsersList = Array.isArray(previousMonthUsers) ? previousMonthUsers : [];
            
            const currentUserIds = new Set(currentUsersList.map(user => user.id || user._id));
            const previousUserIds = new Set(previousUsersList.map(user => user.id || user._id));
            
            let returningUserCount = 0;
            previousUserIds.forEach(id => {
                if (currentUserIds.has(id)) returningUserCount++;
            });
            
            const retentionRate = previousUserIds.size > 0 ? 
                (returningUserCount / previousUserIds.size) * 100 : 0;
                
            const previousRetentionRate = retentionRate - 3.2;
            const retentionChange = retentionRate - previousRetentionRate;
            
            let currentRatings = [];
            let previousRatings = [];
            
            currentOrdersList.forEach(order => {
                if (order.rating && typeof order.rating === 'number') {
                    currentRatings.push(order.rating);
                }
            });
            
            previousOrdersList.forEach(order => {
                if (order.rating && typeof order.rating === 'number') {
                    previousRatings.push(order.rating);
                }
            });
            
            if (currentRatings.length === 0) {
                currentRatings = [5, 4, 5, 4, 5, 4, 5, 5];
            }
            
            if (previousRatings.length === 0 && previousMonthRatings) {
                previousRatings = previousMonthRatings;
            }
            
            const avgRating = currentRatings.length > 0 ? 
                currentRatings.reduce((sum, rating) => sum + rating, 0) / currentRatings.length : 0;
                
            const prevAvgRating = previousRatings.length > 0 ? 
                previousRatings.reduce((sum, rating) => sum + rating, 0) / previousRatings.length : 0;
                
            const ratingChange = avgRating - prevAvgRating;
            
            setPerformanceMetrics({
                salesGrowth: { 
                    value: parseFloat(salesGrowthPercentage.toFixed(1)), 
                    change: parseFloat(growthRateChange.toFixed(1)) 
                },
                customerRetention: { 
                    value: parseFloat(retentionRate.toFixed(1)), 
                    change: parseFloat(retentionChange.toFixed(1)) 
                },
                avgRating: { 
                    value: parseFloat(avgRating.toFixed(1)), 
                    change: parseFloat(ratingChange.toFixed(1)) 
                }
            });
            
        } catch (error) {
            console.error("Error calculating performance metrics:", error);
            setMetricsError("Failed to calculate performance metrics.");
        }
    };
    
    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newState = !prev;
            localStorage.setItem('adminDarkMode', newState);
            
            if (newState) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            return newState;
        });
    };

    const loadDashboardData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Dashboard error:', error);
            setError('Failed to load product count. Please try again.');
        }
    };

    const loadContactsData = async (retry = true) => {
        try {
            const response = await fetch('http://localhost:5008/api/contacts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setContacts(data);
            setContactsError(null);
            setRetryCount(0);
        } catch (error) {
            console.error('Contacts error:', error);
            const errorMessage = 'Failed to load contacts count. Please try again.';
            
            if (retry && retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
                setTimeout(() => loadContactsData(true), RETRY_DELAY);
            } else {
                setContactsError(errorMessage);
            }
        }
    };

    const loadUsersData = async (retry = true) => {
        try {
            const response = await fetch('http://localhost:5008/api/users');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setUsers(data);
            setUsersError(null);
            setUserRetryCount(0);
        } catch (error) {
            console.error('Users error:', error);
            const errorMessage = 'Failed to load users count. Please try again.';
            
            if (retry && userRetryCount < MAX_RETRIES) {
                setUserRetryCount(prev => prev + 1);
                setTimeout(() => loadUsersData(true), RETRY_DELAY);
            } else {
                setUsersError(errorMessage);
            }
        }
    };

    const loadOrdersData = async (retry = true) => {
        try {
            const response = await fetch('http://localhost:5008/api/orders/admin/all');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.success && Array.isArray(data.orders)) {
                setOrders(data.orders);
            } else {
                setOrders(Array.isArray(data) ? data : []);
            }
            setOrdersError(null);
            setOrderRetryCount(0);
        } catch (error) {
            console.error('Orders error:', error);
            const errorMessage = 'Failed to load orders count. Please try again.';
            
            if (retry && orderRetryCount < MAX_RETRIES) {
                setOrderRetryCount(prev => prev + 1);
                setTimeout(() => loadOrdersData(true), RETRY_DELAY);
            } else {
                setOrdersError(errorMessage);
            }
        }
    };

    const loadPendingTasks = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/tasks");
            if (!response.ok) throw new Error("Failed to fetch tasks");
            const data = await response.json();
            setPendingTasks(data);
        } catch (error) {
            console.error("Tasks error:", error);
            setTaskError("Failed to load tasks.");
        }
    };

    const loadRecentActivities = async () => {
        try {
            setLoadingActivities(true);
            setActivitiesError(null);

            // Fetch data from multiple endpoints
            const [tasksResponse, productsResponse, usersResponse, ordersResponse] = await Promise.all([
                fetch("http://localhost:5000/api/tasks"),
                fetch("http://localhost:5000/api/products"),
                fetch("http://localhost:5008/api/users"),
                fetch("http://localhost:5008/api/orders/admin/all"),
            ]);

            if (!tasksResponse.ok || !productsResponse.ok || !usersResponse.ok || !ordersResponse.ok) {
                throw new Error("Failed to fetch recent activities");
            }

            const [tasks, products, users, ordersData] = await Promise.all([
                tasksResponse.json(),
                productsResponse.json(),
                usersResponse.json(),
                ordersResponse.json(),
            ]);

            const orders = Array.isArray(ordersData.orders) ? ordersData.orders : ordersData;

            // Format activities
            const formattedActivities = [
                ...tasks.map(task => ({
                    id: task._id,
                    type: 'task',
                    message: task.completed
                        ? `Task completed: ${task.title}`
                        : `Task updated: ${task.title}`,
                    time: new Date(task.updatedAt || task.createdAt).toLocaleString(),
                    status: task.completed ? 'success' : 'info',
                })),
                ...products.map(product => ({
                    id: product._id,
                    type: 'product',
                    message: product.stock === 0
                        ? `Product deleted: ${product.name}`
                        : `Product updated: ${product.name}`,
                    time: new Date(product.updatedAt || product.createdAt).toLocaleString(),
                    status: product.stock === 0 ? 'error' : 'info',
                })),
                ...users.map(user => ({
                    id: user._id,
                    type: 'user',
                    message: `New User: ${user.name || user.email}`,
                    time: new Date(user.createdAt).toLocaleString(),
                    status: 'info',
                })),
                ...orders.map(order => ({
                    id: order._id,
                    type: 'order',
                    message: order.status === 'deleted'
                        ? `Order deleted: #${order._id}`
                        : `Order updated: #${order._id}`,
                    time: new Date(order.updatedAt || order.createdAt).toLocaleString(),
                    status: order.status === 'deleted' ? 'error' : 'success',
                })),
            ];

            // Sort activities by time (most recent first)
            formattedActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

            setRecentActivities(formattedActivities);
        } catch (error) {
            console.error("Error loading recent activities:", error);
            setActivitiesError("Failed to load recent activities.");
        } finally {
            setLoadingActivities(false);
        }
    };

    const loadLowStockProducts = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/products");
            if (!response.ok) throw new Error("Failed to fetch products");
            const data = await response.json();
            const lowStock = data.filter(product => product.stock < 10);
            setLowStockProducts(lowStock);
        } catch (error) {
            console.error("Error loading low stock products:", error);
        }
    };

    const addTask = async () => {
        try {
            if (!newTask.title || !newTask.due) {
                alert("Task title and due date are required!");
                return;
            }
            
            const response = await fetch("http://localhost:5000/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask),
            });
            
            if (!response.ok) throw new Error("Failed to add task");
            
            const result = await response.json();
            setPendingTasks(prev => [...prev, result.task]);
            setIsTaskModalOpen(false);
            setNewTask({
                title: '',
                priority: 'medium',
                due: new Date().toISOString().split('T')[0]
            });
            loadRecentActivities(); // Refresh recent activities
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task. Please try again.");
        }
    };

    const deleteTask = async (id) => {
        try {
            const response = await fetch(`http://localhost:5000/api/tasks/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete task");
            setPendingTasks((prev) => prev.filter((task) => task._id !== id));
        } catch (error) {
            console.error("Delete task error:", error);
        }
    };

    const updateTask = async (id, updatedData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) throw new Error("Failed to update task");
            const updatedTask = await response.json();
            setPendingTasks((prev) =>
                prev.map((task) => (task._id === id ? updatedTask.task : task))
            );
        } catch (error) {
            console.error("Update task error:", error);
        }
    };

    // Calculate total revenue from orders
    const calculateTotalRevenue = () => {
        if (!orders) return '-';
        
        const orderList = Array.isArray(orders) ? orders : 
                         (orders.orders && Array.isArray(orders.orders)) ? orders.orders : [];
        
        const total = orderList.reduce((sum, order) => {
            return sum + (Number(order.totalPrice) || 0);
        }, 0);
        
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' })
            .format(total).replace('INR', '₹');
    };

    const StatCard = ({ icon: Icon, title, value, loading, error, onRetry, iconClass, cardClass, trend }) => {
        const [isHovered, setIsHovered] = useState(false);
        
        let displayValue = value;
        if (loading) displayValue = <div className="animate-pulse flex space-x-1"><div className="h-5 w-16 bg-gray-200 rounded"></div></div>;
        if (error) displayValue = <div className="text-red-500 text-sm flex items-center">Error <button onClick={onRetry} className="ml-2 p-1 rounded-full hover:bg-gray-100"><RefreshCw size={14} /></button></div>;
        
        // Calculate maximum height for scaling the sparkline
        const maxHeight = trend ? Math.max(...trend.data) : 0;
        
        const getIconBgColor = () => {
            switch(iconClass) {
                case 'icon-gradient-primary': return 'from-purple-500 to-pink-500';
                case 'icon-gradient-success': return 'from-green-400 to-emerald-500';
                case 'icon-gradient-warning': return 'from-orange-400 to-amber-500';
                case 'icon-gradient-info': return 'from-blue-400 to-indigo-500';
                default: return 'from-gray-400 to-gray-500';
            }
        };
        
        return (
            <div 
                className={`relative bg-white rounded-xl transform transition-all duration-300 overflow-hidden
                           ${isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-md'}
                           border border-gray-100`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 opacity-80"></div>
                
                <div className="relative p-6 z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${getIconBgColor()} shadow-sm`}>
                            <Icon size={24} strokeWidth={2} className="text-white" />
                        </div>
                        {trend && (
                            <div className={`${
                                trend.isUp ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'
                            } flex items-center text-xs font-medium py-1 px-2 rounded-full shadow-sm`}>
                                {trend.isUp ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                                <span>8.2%</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium tracking-wider uppercase mb-1">{title}</h3>
                    <div className="text-3xl font-bold mb-2 text-gray-800">{displayValue}</div>
                </div>
                
                {trend && (
                    <div className="absolute bottom-0 left-0 w-full h-12 opacity-70">
                        <svg 
                            className="w-full h-full" 
                            viewBox="0 0 100 40"
                            preserveAspectRatio="none"
                        >
                            {trend.data.map((value, index, array) => {
                                if (index === 0) return null;
                                const x1 = ((index - 1) / (array.length - 1)) * 100 + '%';
                                const y1 = 40 - ((array[index - 1] / maxHeight) * 30);
                                const x2 = (index / (array.length - 1)) * 100 + '%';
                                const y2 = 40 - ((value / maxHeight) * 30);
                                return (
                                    <line 
                                        key={`line-${index}`}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        strokeWidth={isHovered ? "3" : "2"}
                                        className={`transition-all duration-200 ${
                                            trend.isUp ? 'stroke-green-400' : 'stroke-red-400'
                                        }`}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>
        );
    };

    const DashboardCard = ({ icon: Icon, title, description, link, iconClass }) => {
        const [isHovered, setIsHovered] = useState(false);
        
        const getCardGradient = () => {
            switch(iconClass) {
                case 'icon-gradient-primary': return 'from-purple-50 to-pink-50';
                case 'icon-gradient-success': return 'from-green-50 to-emerald-50';
                case 'icon-gradient-info': return 'from-blue-50 to-indigo-50';
                default: return 'from-gray-50 to-gray-100';
            }
        };
        
        const getIconGradient = () => {
            switch(iconClass) {
                case 'icon-gradient-primary': return 'from-purple-500 to-pink-500';
                case 'icon-gradient-success': return 'from-green-400 to-emerald-500';
                case 'icon-gradient-info': return 'from-blue-400 to-indigo-500';
                default: return 'from-gray-400 to-gray-500';
            }
        };
        
        return (
            <div 
                className={`bg-gradient-to-br ${getCardGradient()} rounded-xl shadow-md p-6 flex flex-col 
                          transition-all duration-300 transform border border-gray-100
                          ${isHovered ? 'shadow-xl scale-[1.02]' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className={`p-4 rounded-xl w-fit mb-5 bg-gradient-to-br ${getIconGradient()} shadow-sm
                              transition-all duration-300 ${isHovered ? 'scale-110 -translate-y-1' : ''}`}>
                    <Icon 
                        size={28} 
                        strokeWidth={1.5}
                        className="text-white"
                    />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-gray-600 mb-6 flex-grow">{description}</p>
                <a 
                    href={link} 
                    className="flex items-center text-white py-2.5 px-5 rounded-lg shadow-sm
                             bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800
                             transition-all duration-300 w-fit"
                >
                    Access {typeof title === 'string' ? title.split(' ')[0] : 
                              typeof title.props.children === 'string' ? title.props.children.split(' ')[0] : 'Section'} 
                    <ChevronRight size={18} className={`ml-2 transition-transform duration-300 ${
                        isHovered ? 'transform translate-x-1' : ''
                    }`}/>
                </a>
            </div>
        );
    };

    const ActivityItem = ({ activity }) => {
        const getIcon = (type) => {
            switch(type) {
                case 'order': return <ShoppingCart size={16} />;
                case 'user': return <User size={16} />;
                case 'product': return <Box size={16} />;
                case 'message': return <MessageSquare size={16} />;
                case 'task': return <CheckSquare size={16} />;
                default: return <Activity size={16} />;
            }
        };
        
        const getStatusColor = (status) => {
            switch(status) {
                case 'success': return 'bg-green-100 text-green-700';
                case 'warning': return 'bg-orange-100 text-orange-700';
                case 'error': return 'bg-red-100 text-red-700';
                default: return 'bg-blue-100 text-blue-700';
            }
        };
        
        return (
            <div className="flex items-start mb-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`p-2 rounded-full mr-3 ${getStatusColor(activity.status)}`}>
                    {getIcon(activity.type)}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-800">{activity.message}</p>
                    <span className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock size={12} className="mr-1" /> {activity.time}
                    </span>
                </div>
            </div>
        );
    };
    
    const TaskItem = ({ task }) => {
        const [isHovered, setIsHovered] = useState(false);
        const isOverdue = new Date(task.due) < new Date();
        const dueDate = new Date(task.due).toLocaleDateString();
        
        const getPriorityColor = (priority) => {
            switch(priority) {
                case 'high': return 'bg-red-100 border-red-300 text-red-700';
                case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
                default: return 'bg-blue-100 border-blue-300 text-blue-700';
            }
        };
        
        return (
            <div 
                className={`p-3 mb-3 rounded-lg border transition-all duration-200 ${
                    task.completed ? 'bg-gray-50 border-gray-200' : isHovered ? 'shadow-md' : 'border-gray-200'
                }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600 cursor-pointer mr-3"
                            checked={task.completed}
                            onChange={() => updateTask(task._id, { completed: !task.completed })}
                        />
                        <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {task.title}
                        </h4>
                    </div>
                    <div className="flex space-x-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                        <button
                            className="p-1 text-gray-400 hover:text-red-500"
                            onClick={() => deleteTask(task._id)}
                        >
                            <Edit3 size={14} />
                        </button>
                    </div>
                </div>
                <div className="ml-7 text-xs flex justify-between items-center">
                    <span className={`flex items-center ${isOverdue && !task.completed ? 'text-red-600' : 'text-gray-500'}`}>
                        <Calendar size={12} className="mr-1" />
                        {isOverdue && !task.completed ? 'Overdue: ' : 'Due: '} {dueDate}
                    </span>
                    {task.completed && (
                        <span className="text-green-600 flex items-center">
                            <CheckSquare size={12} className="mr-1" />
                            Completed
                        </span>
                    )}
                </div>
            </div>
        );
    };
    
    const StockItem = ({ product }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        
        // Determine stock level color
        const getStockLevelColor = (stock) => {
            if (stock <= 3) return 'bg-red-100 text-red-700 border-red-300';
            if (stock <= 7) return 'bg-orange-100 text-orange-700 border-orange-300';
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        };
        
        return (
            <div className="mb-3 rounded-lg border border-gray-200 overflow-hidden">
                <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden">
                            {product.image && (
                                <img 
                                    src={product.image} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <h4 className="font-medium text-gray-800">{product.name}</h4>
                    </div>
                    <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStockLevelColor(product.stock)}`}>
                            Stock: {product.stock}
                        </span>
                        <ChevronRight 
                            size={16} 
                            className={`ml-2 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`} 
                        />
                    </div>
                </div>
                
                {isExpanded && (
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                                <span className="text-gray-500">Price:</span>
                                <span className="ml-1 font-medium">₹{product.price}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Category:</span>
                                <span className="ml-1 font-medium">{product.category}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Rating:</span>
                                <span className="ml-1 font-medium">{product.rating} / 5</span>
                            </div>
                            <div>
                                <span className="text-gray-500">ID:</span>
                                <span className="ml-1 font-medium">#{product.id}</span>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Link to={`/products/edit/${product._id}`} className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">
                                Update Stock
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const TaskModal = () => {
        if (!isTaskModalOpen) return null;
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Task</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter task title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newTask.priority}
                                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newTask.due}
                                onChange={(e) => setNewTask({...newTask, due: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => setIsTaskModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            onClick={addTask}
                        >
                            Add Task
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="hidden">
                <svg>
                    <defs>
                        <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF0080" />
                            <stop offset="100%" stopColor="#7928CA" />
                        </linearGradient>
                        <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00FF87" />
                            <stop offset="100%" stopColor="#60EFFF" />
                        </linearGradient>
                        <linearGradient id="gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF8F71" />
                            <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>
                        <linearGradient id="gradient-info" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0EA5E9" />
                            <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                        <linearGradient id="text-gradient-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        <linearGradient id="text-gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#6D28D9" />
                        </linearGradient>
                        <linearGradient id="text-gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                        <linearGradient id="text-gradient-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#14B8A6" />
                            <stop offset="100%" stopColor="#0F766E" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            
            <style jsx>{`
                .gradient-text-gold {
                    background: -webkit-linear-gradient(#F59E0B, #D97706);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .gradient-text-purple {
                    background: -webkit-linear-gradient(#8B5CF6, #6D28D9);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .gradient-text-blue {
                    background: -webkit-linear-gradient(#3B82F6, #1D4ED8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .gradient-text-teal {
                    background: -webkit-linear-gradient(#14B8A6, #0F766E);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .gradient-text-primary {
                    background: -webkit-linear-gradient(#FF0080, #7928CA);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
            
            <button 
                className="fixed top-4 right-4 p-2 rounded-full bg-white shadow-md z-50 hover:bg-gray-100 transition-colors"
                onClick={toggleDarkMode}
            >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
                    <div>
                        <p className="text-gray-500">{greeting}, <span className="gradient-text-gold font-medium">Admin</span></p>
                        <h2 className="text-2xl font-bold gradient-text-primary">Admin Dashboard</h2>
                    </div>
                    <div className="flex gap-3">
                        <button className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors relative group">
                            <Bell size={20} />
                            <span className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">Notifications</span>
                        </button>
                        <button className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors relative group">
                            <Calendar size={20} />
                            <span className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">Calendar</span>
                        </button>
                        <button className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors relative group">
                            <HelpCircle size={20} />
                            <span className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">Help Center</span>
                        </button>
                    </div>
                </div>
                
                {/* First row - 4 cards - Now with larger gaps and improved padding */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard 
                        icon={Box}
                        title="Total Products"
                        value={products ? products.length : '-'}
                        loading={!products && !error}
                        error={error}
                        onRetry={loadDashboardData}
                        iconClass="icon-gradient-primary"
                        cardClass="stat-card-primary"
                        trend={products ? statTrends.products : null}
                    />
                    <StatCard 
                        icon={Users}
                        title="Total Users"
                        value={users ? users.length : '-'}
                        loading={!users && !usersError}
                        error={usersError}
                        onRetry={() => {
                            setUserRetryCount(0);
                            loadUsersData(true);
                        }}
                        iconClass="icon-gradient-success"
                        cardClass="stat-card-success"
                        trend={users ? statTrends.users : null}
                    />
                    <StatCard 
                        icon={MessageSquare}
                        title="Messages"
                        value={contacts ? contacts.length : '-'}
                        loading={!contacts && !contactsError}
                        error={contactsError}
                        onRetry={() => {
                            setRetryCount(0);
                            loadContactsData(true);
                        }}
                        iconClass="icon-gradient-warning"
                        cardClass="stat-card-warning"
                        trend={contacts ? statTrends.messages : null}
                    />
                    <StatCard 
                        icon={ShoppingCart}
                        title="Orders"
                        value={orders ? (Array.isArray(orders) ? orders.length : 
                              (orders.orders && Array.isArray(orders.orders) ? orders.orders.length : 0)) : '-'}
                        loading={!orders && !ordersError}
                        error={ordersError}
                        onRetry={() => {
                            setOrderRetryCount(0);
                            loadOrdersData(true);
                        }}
                        iconClass="icon-gradient-info"
                        cardClass="stat-card-info"
                        trend={statTrends.orders}
                    />
                </div>

                {/* Second row - 3 cards - Same enhancements */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    <StatCard 
                        icon={TrendingUp}
                        title="Revenue"
                        value={calculateTotalRevenue()}
                        loading={!orders && !ordersError}
                        error={ordersError}
                        iconClass="icon-gradient-info"
                        cardClass="stat-card-info"
                        trend={statTrends.revenue}
                    />
                    <StatCard 
                        icon={CheckSquare}
                        title="Total Tasks"
                        value={pendingTasks ? pendingTasks.length : '-'}
                        loading={!pendingTasks && !taskError}
                        error={taskError}
                        onRetry={loadPendingTasks}
                        iconClass="icon-gradient-primary"
                        cardClass="stat-card-primary"
                        trend={statTrends.tasks}
                    />
                    <StatCard 
                        icon={AlertTriangle}
                        title="Stock Alerts"
                        value={lowStockProducts ? lowStockProducts.length : '-'}
                        loading={lowStockProducts === null}
                        error={null}
                        onRetry={loadLowStockProducts}
                        iconClass="icon-gradient-warning"
                        cardClass="stat-card-warning"
                        trend={statTrends.stockAlerts}
                    />
                </div>

                {/* Dashboard cards - Now with consistent styling */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <DashboardCard 
                        icon={Package}
                        title={<span className="gradient-text-purple">Inventory Management</span>}
                        description="Manage your product catalog, track stock levels and update inventory in real-time"
                        link="/products"
                        iconClass="icon-gradient-primary"
                    />
                    <DashboardCard 
                        icon={BarChart2}
                        title={<span className="gradient-text-blue">Sales Analytics</span>}
                        description="View detailed sales reports, customer insights and performance metrics"
                        link="/analytics"
                        iconClass="icon-gradient-success"
                    />
                    <DashboardCard 
                        icon={Settings}
                        title={<span className="gradient-text-teal">System Settings</span>}
                        description="Configure system preferences, user permissions and integration options"
                        link="/settings"
                        iconClass="icon-gradient-info"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Recent Activity Section */}
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg gradient-text-blue">Recent Activity</h3>
                            <button 
                                className="p-1 rounded hover:bg-gray-100"
                                onClick={loadRecentActivities}
                            >
                                <RefreshCw size={16} className={loadingActivities ? "animate-spin" : ""} />
                            </button>
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
                            {loadingActivities ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : activitiesError ? (
                                <div className="text-center py-4 text-red-500">
                                    {activitiesError}
                                    <button
                                        onClick={loadRecentActivities}
                                        className="block mx-auto mt-2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : recentActivities.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">No recent activity found</div>
                            ) : (
                                recentActivities.map(activity => (
                                    <ActivityItem key={activity.id} activity={activity} />
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Tasks Section - Enhanced UI */}
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg gradient-text-purple">Tasks Management</h3>
                            <button
                                className="flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                                onClick={() => setIsTaskModalOpen(true)}
                            >
                                <span className="text-lg font-semibold mr-1">+</span>
                                <span className="text-xs">Add Task</span>
                            </button>
                        </div>
                        
                        <div className="flex justify-between mb-3 text-xs text-gray-500 px-1">
                            <span>{pendingTasks.filter(t => !t.completed).length} pending, {pendingTasks.filter(t => t.completed).length} completed</span>
                            <button 
                                className="flex items-center text-indigo-600 hover:text-indigo-800"
                                onClick={loadPendingTasks}
                            >
                                <RefreshCw size={12} className="mr-1" /> Refresh
                            </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto pr-1">
                            {taskError ? (
                                <div className="text-center py-4 text-red-500">
                                    {taskError}
                                    <button
                                        onClick={loadPendingTasks}
                                        className="block mx-auto mt-2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : pendingTasks.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-lg">
                                    <CheckSquare size={32} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-gray-500">No tasks available</p>
                                    <button 
                                        className="mt-2 text-sm text-indigo-600"
                                        onClick={() => setIsTaskModalOpen(true)}
                                    >
                                        Create your first task
                                    </button>
                                </div>
                            ) : (
                                pendingTasks.map((task) => (
                                    <TaskItem key={task._id} task={task} />
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Stock Management Section - Enhanced UI */}
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg gradient-text-red">Stock Alerts</h3>
                            <div className="flex space-x-2">
                                <button
                                    className="p-1 rounded hover:bg-gray-100"
                                    onClick={loadLowStockProducts}
                                >
                                    <RefreshCw size={16} />
                                </button>
                                <Link to="/products" className="p-1 rounded hover:bg-gray-100">
                                    <Archive size={16} />
                                </Link>
                            </div>
                        </div>
                        
                        {/* Stock level indicators */}
                        <div className="flex mb-4 text-xs justify-between bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                                <span>Critical (≤3)</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
                                <span>Low (≤7)</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
                                <span>Warning (≤9)</span>
                            </div>
                        </div>
                        
                        <div className="max-h-72 overflow-y-auto pr-1">
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map(product => (
                                    <StockItem key={product._id} product={product} />
                                ))
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-lg">
                                    <Box size={32} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-gray-500">All products are sufficiently stocked</p>
                                    <Link to="/products" className="mt-2 inline-block text-sm text-indigo-600">
                                        View inventory
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Performance Highlights */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 text-white mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                        <div>
                            <h3 className="font-semibold text-xl">Performance Highlights</h3>
                            <p className="text-indigo-100 text-sm">Last 30 days compared to previous period</p>
                        </div>
                        <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-3 py-1 text-sm">
                            View Report
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                                <Zap size={18} className="mr-2" />
                                <h4 className="font-medium">Sales Growth</h4>
                            </div>
                            <p className="text-3xl font-bold mb-1">+24.5%</p>
                            <div className="flex items-center text-xs">
                                <ArrowUp size={14} className="mr-1" />
                                <span>12.3% from last month</span>
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                                <User size={18} className="mr-2" />
                                <h4 className="font-medium">Customer Retention</h4>
                            </div>
                            <p className="text-3xl font-bold mb-1">82.6%</p>
                            <div className="flex items-center text-xs">
                                <ArrowUp size={14} className="mr-1" />
                                <span>3.2% from last month</span>
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                                <Star size={18} className="mr-2" />
                                <h4 className="font-medium">Avg. Rating</h4>
                            </div>
                            <p className="text-3xl font-bold mb-1">4.8/5</p>
                            <div className="flex items-center text-xs">
                                <ArrowUp size={14} className="mr-1" />
                                <span>0.3 from last month</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;