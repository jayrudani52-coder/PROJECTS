import matplotlib.pyplot as plt
import csv


class FitnessTracker:
    def __init__(self):
        self.weightloss_csv = "weightloss.csv"
        self.clientdata_csv = "clientdata.csv"
        self.user_id_count  = 0  # Counter for generating user IDs
        self.user_list_file = "user_list.csv"  # File to store user names and IDs
        print("Connected to CSV files successfully!")

    def generate_user_id(self):
        self.user_id_count += 1
        return self.user_id_count

    def calculate_bmi(self, weight_in_kg, height_in_cm):
        height_in_m = height_in_cm / 100
        bmi = weight_in_kg / (height_in_m ** 2)
        return bmi

    def calculate_bmr(self, weight, height, age, gender):
        if gender.lower() == "male":
            bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        else:
            bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
        return bmr

    def calculate_daily_calories(self, bmr, purpose):
        if purpose == "Weight Loss":
            return bmr * 1.2  # Suggesting a daily calorie intake for weight loss
        elif purpose == "Weight Gain":
            return bmr * 1.5  # Suggesting a daily calorie intake for weight gain
        else:
            return bmr * 1.3  # Suggesting a daily calorie intake for weight maintenance

    def save_weight_loss_data(self, name, weight_loss, timeframe):
        try:
            with open(self.weightloss_csv, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([name, weight_loss, timeframe])
            print("Weight loss data for {} saved successfully!".format(name))
        except Exception as e:
            print("An error occurred while saving weight loss data for {}: {}".format(
                name, str(e)))

    def save_user_data(self, user_id, name, age, weight, height, bmi, bmr, gender, purpose):
        try:
            with open(self.clientdata_csv, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([user_id, name, age, weight, height,
                                 bmi, bmr, gender, purpose])
            print("User data for {} saved successfully!".format(name))
        except Exception as e:
            print("An error occurred while saving user data for {}: {}".format(
                name, str(e)))
        # Save user name and ID to user list file
        try:
            with open(self.user_list_file, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([user_id, name])
            print("User {} added to the user list.".format(name))
        except Exception as e:
            print("An error occurred while saving user data to the user list:", str(e))

    def display_user_data(self, user_id):
        try:
            with open(self.clientdata_csv, mode='r') as file:
                reader = csv.reader(file)
                for row in reader:
                    if row and row[0] == str(user_id):
                        print("\n=== User Information ===")
                        print("ID:", row[0])
                        print("Name:", row[1])
                        print("Age:", row[2])
                        print("Weight:", row[3], "kg")
                        print("Height:", row[4], "cm")
                        print("BMI:", row[5])
                        print("BMR:", row[6])
                        print("Gender:", row[7])
                        print("Purpose:", row[8])
                        return
                print("User with ID {} not found.".format(user_id))
        except Exception as e:
            print("An error occurred while retrieving user data:", str(e))

    def track_activity(self):
        D=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]
        days_of_activity=int(input("Enter Days"))
        list_of_Cal_per_day=[]
        Days=[]
    
        for i in D:
            if i == days_of_activity:
                Days.append(i)
                break
            else:
                Days.append(i)    
        for i in range(days_of_activity):
            print('Enter Calories you have burnt on day ',(i+1),' : ')
            cperd=input()
            list_of_Cal_per_day.append(cperd)
        
        list_of_Cal_per_day1=[]
        Days1=[]
        
      
        
        plt.xlabel('Days of Activity')
        plt.ylabel('Calories')    
        
        plt.bar(Days,list_of_Cal_per_day) 
        plt.title("Your Activity CHART")
        plt.show()
        # try:
        #     user_id = int(input("Enter your user ID: "))
        #     self.display_user_data(user_id)
        # except Exception as e:
        #     print("An error occurred while tracking activity:", str(e))

    def suggest_task(self, purpose, user_id, bmi):
        print("\nUser ID:", user_id)

        # Determine BMI category
        if bmi < 18.5:
            bmi_category = "Underweight"
        elif 18.5 <= bmi < 25:
            bmi_category = "Healthy Weight"
        elif 25 <= bmi < 30:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obesity"

        print("BMI Category:", bmi_category)

        # Print warnings based on BMI
        if bmi < 16:
            print(
                "Warning: You are severely underweight. Consult a healthcare professional.")
        elif 25 <= bmi:
            print(
                "Warning: Avoid gaining more weight. Consult a healthcare professional.")

        # Print task suggestions based on purpose
        if purpose == "Weight Loss":
            print("\nHere are some suggestions for weight loss:")
            print(
                "- Maintain a calorie deficit by consuming fewer calories than you burn.")
            print("- Include more fruits, vegetables, and lean proteins in your diet.")
            print(
                "- Engage in regular cardiovascular exercises like running, swimming, or cycling.")
            print(
                "- Incorporate strength training exercises to build muscle and boost metabolism.")
        elif purpose == "Weight Gain":
            print("\nHere are some suggestions for weight gain:")
            print("- Consume more calories than you burn to create a calorie surplus.")
            print(
                "- Focus on nutrient-dense foods such as nuts, seeds, avocados, and whole grains.")
            print("- Incorporate resistance training exercises to build muscle mass.")
            print(
                "- Consider adding protein shakes or weight gain supplements to your diet.")
        elif purpose == "Maintain Weight":
            print("\nHere are some suggestions for maintaining weight:")
            print("- Eat a balanced diet with a variety of nutrient-rich foods.")
            print("- Practice portion control to avoid overeating.")
            print(
                "- Stay physically active with a combination of cardiovascular and strength training exercises.")
            print(
                "- Monitor your weight regularly and adjust your diet and exercise as needed.")

    def enter_personal_details(self):
        name = input("Enter Your Name: ")
        age = int(input("Enter Your Age: "))
        weight = float(input("Enter Your Weight (in kg): "))
        height = float(input("Enter Your Height (in cm): "))
        gender = input("Enter Your Gender (Male or Female): ")
        return name, age, weight, height, gender

    def login_or_signup(self):
        print("\n~~~ Health and Fitness Tracker ~~~")
        while True:
            choice = input("Login (L) or Sign up (S)?").strip().lower()
            if choice == 'l':
                user_id = input("Enter your user ID: ").strip()
                if self.check_user_exists(user_id):
                    return user_id
                else:
                    print("User ID not found. Please sign up.")
            elif choice == 's':
                name, age, weight, height, gender = self.enter_personal_details()
                user_id = self.generate_user_id()
                self.save_user_data(user_id, name, age, weight,
                                    height, 0, 0, gender, "Not Specified")
                print("Your user ID is:", user_id)
                return user_id
            else:
                print("Invalid choice. Please enter 'L' to login or 'S' to sign up.")

    def check_user_exists(self, user_id):
        try:
            with open(self.clientdata_csv, mode='r') as file:
                reader = csv.reader(file)
                for row in reader:
                    if row and row[0] == str(user_id):
                        return True
                return False
        except Exception as e:
            print("An error occurred while checking user existence:", str(e))
            return False

    def run(self):
        try:
            user_id = self.login_or_signup()

            while True:
                print("\n~~~ Welcome To Health and Fitness Tracker Portal ~~~")
                print("What is the reason you've joined this portal?")
                print(
                    "1. Lose Weight\n2. Gain Weight\n3. Maintain Weight\n4. Track Your Activity\n5. Exit")
                choice = input("Enter your choice: ")

                if choice == '5':
                    print("Exiting portal...")
                    break

                if choice in ['1', '2', '3']:
                    print("\nEnter Your Personal Info:")
                    name, age, weight, height, gender = self.enter_personal_details()
                    bmi = self.calculate_bmi(weight, height)
                    self.suggest_task(choice, user_id, bmi)

                    if choice == '1':
                        weight_loss = float(
                            input("How much Weight (in kg) do you want to lose? "))
                        timeframe = int(
                            input("What should be the timeframe (days) of your weight loss? "))
                        self.save_weight_loss_data(
                            name, weight_loss, timeframe)
                        purpose = "Weight Loss"
                    elif choice == '2':
                        self.save_user_data(
                            user_id, name, age, weight, height, bmi, 0, gender, "Weight Gain")
                        purpose = "Weight Gain"
                    elif choice == '3':
                        self.save_user_data(
                            user_id, name, age, weight, height, bmi, 0, gender, "Maintain Weight")
                    daily_BMR=self.calculate_bmr(weight,height,age,gender)
                    daily_calories = self.calculate_daily_calories(daily_BMR, purpose)
                    print("\nYour recommended daily calorie intake for {} is: {:.2f} calories".format(
                        purpose, daily_calories))
                    print("BMI: {:.2f}".format(bmi))

                elif choice == '4':
                    self.track_activity()
                else:
                    print("Invalid choice. Please enter a valid option.")

        except Exception as e:
            print("An error occurred:", str(e))


if __name__ == "__main__":
    tracker = FitnessTracker()
    tracker.run()