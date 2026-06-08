'use client';

import { useState } from 'react';
import Link from "next/link";
import { CourseCard } from "@/components/testnet-hub-gcv-advanced";

const courses = [
    {
        id: 1,
        title: "Blockchain Fundamentals",
        instructor: "Dr. Sarah Chen",
        category: "Technology",
        priceTriSyn: 150,
        students: 4820,
        rating: 4.9,
        duration: "8 weeks",
        modules: 12,
        icon: "⛓️",
    },
    {
        id: 2,
        title: "Pi Network Economics",
        instructor: "Prof. James Liu",
        category: "Finance",
        priceTriSyn: 120,
        students: 3240,
        rating: 4.8,
        duration: "6 weeks",
        modules: 10,
        icon: "💰",
    },
    {
        id: 3,
        title: "Web3 Development",
        instructor: "Alex Rodriguez",
        category: "Programming",
        priceTriSyn: 200,
        students: 2105,
        rating: 4.9,
        duration: "10 weeks",
        modules: 15,
        icon: "💻",
    },
    {
        id: 4,
        title: "Smart Contracts 101",
        instructor: "Dr. Emma Thompson",
        category: "Technology",
        priceTriSyn: 180,
        students: 1856,
        rating: 4.7,
        duration: "8 weeks",
        modules: 11,
        icon: "📋",
    },
];

const books = [
    {
        id: 1,
        title: "The Pi Network Revolution",
        author: "Nicholas Kokalis",
        priceTriSyn: 25,
        pages: 320,
        format: "PDF + ePub",
        purchases: 5240,
        icon: "📖",
    },
    {
        id: 2,
        title: "DeFi Essentials",
        author: "Linda Wang",
        priceTriSyn: 35,
        pages: 480,
        format: "PDF + ePub + Audiobook",
        purchases: 3120,
        icon: "📚",
    },
    {
        id: 3,
        title: "Crypto Security Guide",
        author: "Michael Sterling",
        priceTriSyn: 30,
        pages: 250,
        format: "PDF",
        purchases: 2890,
        icon: "🔐",
    },
];

const mealPlans = [
    {
        id: 1,
        name: "Student Starter",
        meals: "5 meals/week",
        priceTriSyn: 45,
        duration: "4 weeks",
        icon: "🍱",
        benefits: ["Breakfast", "Lunch", "Healthy snacks"],
    },
    {
        id: 2,
        name: "Campus Professional",
        meals: "10 meals/week",
        priceTriSyn: 85,
        duration: "4 weeks",
        icon: "🥗",
        benefits: ["All meals", "Dietary options", "Delivery included"],
    },
    {
        id: 3,
        name: "Full Time Scholar",
        meals: "21 meals/week",
        priceTriSyn: 180,
        duration: "4 weeks",
        icon: "🍽️",
        benefits: ["All meals", "Premium dining", "Priority delivery"],
    },
];

const clothing = [
    {
        id: 1,
        name: "Campus Wear Collection",
        items: 50,
        price: "From 20 TriSyn",
        style: "Casual & Comfortable",
        icon: "👕",
    },
    {
        id: 2,
        name: "Professional Attire",
        items: 80,
        price: "From 40 TriSyn",
        style: "Business & Formal",
        icon: "👔",
    },
    {
        id: 3,
        name: "Semester Essentials",
        items: 120,
        price: "From 15 TriSyn",
        style: "Basics & Accessories",
        icon: "🧦",
    },
];

return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-900 to-slate-900">
        {/* Header */}
        <header className="border-b border-green-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/testnet-hub" className="text-gray-400 hover:text-white transition-colors">← Back</Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white">🎓 Education Platform</h1>
                            <p className="text-sm text-gray-400">Courses, books, meal plans, and student clothing - all with GCV pricing</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Courses Section */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Featured Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {courses.map((course) => (
                        <CourseCard
                            key={course.id}
                            id={course.id}
                            title={course.title}
                            instructor={course.instructor}
                            category={course.category}
                            priceTriSyn={course.priceTriSyn}
                            students={course.students}
                            rating={course.rating}
                            duration={course.duration}
                            modules={course.modules}
                            icon={course.icon}
                        />
                    ))}
                </div>
            </div>

            {/* Books Section */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Digital Library</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {books.map((book) => {
                        const { createPriceDisplay } = require('@/lib/gcv-conversion');
                        const priceDisplay = createPriceDisplay(book.priceTriSyn);
                        return (
                            <div key={book.id} className="rounded-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/20 hover:border-blue-400/60 p-6 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                                <div className="text-5xl mb-4">{book.icon}</div>
                                <h3 className="font-bold text-white mb-1">{book.title}</h3>
                                <p className="text-xs text-gray-400 mb-4">by {book.author}</p>

                                <div className="mb-4 space-y-2 text-sm text-gray-300">
                                    <p>📄 {book.pages} pages</p>
                                    <p>📦 {book.format}</p>
                                    <p className="text-gray-500">📊 {book.purchases} purchases</p>
                                </div>

                                <div className="rounded-lg bg-black/40 p-3 mb-3">
                                    <p className="text-xs text-gray-400">Price</p>
                                    <p className="font-mono font-bold text-blue-300">{priceDisplay.combined}</p>
                                </div>

                                <button className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500/50 to-indigo-500/50 hover:from-blue-500 hover:to-indigo-500 font-semibold text-white transition-all">
                                    Buy Now
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Meal Plans Section */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Campus Meal Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mealPlans.map((plan) => {
                        const { createPriceDisplay } = require('@/lib/gcv-conversion');
                        const priceDisplay = createPriceDisplay(plan.priceTriSyn);
                        return (
                            <div key={plan.id} className="rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/20 hover:border-purple-400/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-purple-500/20">
                                <div className="p-6 bg-black/30">
                                    <div className="text-5xl mb-3">{plan.icon}</div>
                                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                    <p className="text-sm text-gray-400 mb-4">{plan.meals} • {plan.duration}</p>

                                    <div className="space-y-2 mb-4">
                                        {plan.benefits.map((benefit, idx) => (
                                            <p key={idx} className="text-sm text-gray-300">✓ {benefit}</p>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-6 py-3 border-t border-purple-500/10 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                                    <div className="rounded-lg bg-black/40 p-3 mb-3">
                                        <p className="text-xs text-gray-400">Subscription Price</p>
                                        <p className="font-mono font-bold text-purple-300">{priceDisplay.combined}</p>
                                    </div>
                                    <button className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500/50 to-pink-500/50 hover:from-purple-500 hover:to-pink-500 font-semibold text-white transition-all">
                                        Subscribe Now
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Student Clothing Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Student Clothing Store</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {clothing.map((collection) => (
                        <div key={collection.id} className="rounded-xl bg-gradient-to-br from-cyan-900/40 to-teal-900/40 border border-cyan-500/20 hover:border-cyan-400/60 p-6 transition-all hover:shadow-lg hover:shadow-cyan-500/20">
                            <div className="text-5xl mb-4">{collection.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-1">{collection.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">{collection.items} items • {collection.style}</p>

                            <div className="mb-4 p-3 rounded-lg bg-black/40">
                                <p className="font-bold text-cyan-400">{collection.price}</p>
                            </div>

                            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500/50 to-teal-500/50 hover:from-cyan-500 hover:to-teal-500 font-semibold text-white transition-all">
                                Shop Collection
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Learning Rewards */}
            <div className="rounded-xl bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 p-8">
                <h3 className="text-2xl font-bold text-white mb-4">🎁 Learning Rewards Program</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-lg bg-black/40 p-4">
                        <p className="text-sm text-gray-400 mb-2">Course Completion</p>
                        <p className="text-2xl font-bold text-yellow-400">50 TriSyn</p>
                        <p className="text-xs text-gray-500 mt-2">For each course completed</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-4">
                        <p className="text-sm text-gray-400 mb-2">Perfect Attendance</p>
                        <p className="text-2xl font-bold text-yellow-400">25 TriSyn</p>
                        <p className="text-xs text-gray-500 mt-2">All modules completed on time</p>
                    </div>
                    <div className="rounded-lg bg-black/40 p-4">
                        <p className="text-sm text-gray-400 mb-2">Referral Bonus</p>
                        <p className="text-2xl font-bold text-yellow-400">100 TriSyn</p>
                        <p className="text-xs text-gray-500 mt-2">When friends enroll via your link</p>
                    </div>
                </div>
            </div>
        </main>
    </div>
);
}
