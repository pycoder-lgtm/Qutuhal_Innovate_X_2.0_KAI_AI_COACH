# 🏋️‍♂️ KAI AI COACH
> **A Posture-First, Multimodal AI Fitness & Biomechanics Assistant** > *Built for Qutuhal Innovate X 2.0 Sprint*

---

## 📌 Problem Statement
Traditional fitness applications (e.g., Fitbod, MyFitnessPal) offer static routines assuming every user possesses optimal biomechanics and joint mobility. They fail to evaluate underlying postural issues—such as Anterior Pelvic Tilt or shoulder asymmetry—leading to suboptimal movement patterns and increased risk of injury during heavy loading.

## 💡 The Solution
**Coach Kai** is a posture-first AI ecosystem powered by Gemini's multimodal vision capabilities. Before recommending routines, Kai performs a **4-angle, head-to-toe postural assessment**. It identifies structural imbalances and dynamically modifies exercise selections (e.g., replacing heavy barbell back squats with goblet squats for users with lumbar stress) to ensure safe, hyper-personalized training.

---

## 📊 Competitor Comparison Matrix

| Feature / Capability | **Coach Kai** | Fitbod | MyFitnessPal | Fitbit |
| :--- | :--- | :--- | :--- | :--- |
| **4-Angle Posture Scan** | ✅ **Yes (Gemini Vision)** | ❌ No | ❌ No | ❌ No |
| **Posture-to-Exercise Swaps** | ✅ **Yes** | ❌ No | ❌ No | ❌ No |
| **Unified AI Coach (Chat + Vision)**| ✅ **Yes** | ❌ No | ❌ No | ❌ No |
| **Workout & Meal Tracking** | ✅ **Yes** | ✅ Workouts Only | ✅ Meals Only | ⚠️ Wearable Only |

---

## 👤 Target Personas
* **Persona A (Beginners & Teenagers):** Individuals starting strength training who require posture checks to avoid joint strain and build foundational form safely.
* **Persona B (Fitness Enthusiasts):** Lifters recovering from minor postural imbalances who need dynamic exercise modifications tailored to their biomechanics.

---

## 🏗️ Technical Architecture
* **Frontend / Workspace:** Google AI Studio (HTML / CSS / JavaScript)
* **Backend & Auth:** Firebase (Authentication & Cloud Firestore)
* **AI Engine:** Gemini 1.5 Flash / Gemini 1.5 Pro (Multimodal Vision API)
* **API Integrations:** Open Food Facts API (Nutrition), OpenStreetMap (Gym & Shop Locator)
* **Reliability:** Built-in client-side credit rate limiting, model failover handling, and offline dataset fallbacks.

---

## 📜 License
This project is licensed under the **MIT License**.
