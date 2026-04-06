import java.time.LocalTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

class Digitalclock 
{
    int hour;
	int minute;
	int second;
    String timeformat;
	LocalDate date;
	
    Digitalclock()
	{
		LocalTime now = LocalTime.now(); 
		this.date = LocalDate.now(); 
        this.hour = now.getHour();
        this.minute = now.getMinute();
        this.second = now.getSecond();
        this.timeformat = (hour >= 12) ? "PM" : "AM";

        this.hour = (hour == 0) ? 12 : (hour > 12) ? hour - 12 : hour;
    }
	
    void displaytime() 
	{
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
		String formattedDate = date.format(formatter);
        System.out.printf("Current Time and Date: %s %02d:%02d:%02d %s%n", formattedDate, hour, minute, second, timeformat);
    }

    void updatetime(int hour, int minute, int second, String timeformat) 
	{
        if (hour < 1 || hour > 12 || minute < 0 || minute >= 60 || second < 0 || second >= 60) 
		{
            System.out.println("Invalid time input. Please enter a valid time.");
            return;
        }
		
		if (!timeformat.equalsIgnoreCase("AM") && !timeformat.equalsIgnoreCase("PM")) 
        {
        System.out.println("Invalid time format. Please enter AM or PM.");
        return;
        }
	
		this.hour = hour;
        this.minute = minute;
        this.second = second;
		this.timeformat = timeformat.toUpperCase();
		
        int actualHour = (this.timeformat.equals("PM") && this.hour !=12) ? this.hour + 12 : (this.timeformat.equals("AM") && this.hour == 12) ? 0: this.hour;

        LocalTime currentTime = LocalTime.of(actualHour, this.minute, this.second);
        LocalTime now = LocalTime.now();
        if(currentTime.isBefore(now)) 
		{
            this.date = this.date.plusDays(1);
        } 
    }
	
    void checktimeformat() 
	{
        if (timeformat.equalsIgnoreCase("AM") || timeformat.equalsIgnoreCase("PM"))
		{
            System.out.println("Valid time format.");
        } 
		else
		{
            System.out.println("Invalid time format.");
        }
    }
	
    void incrementtime()
	{
        second++;
        if (second >= 60)
		{
			second = 0 ;
            minute++;
        }
        if (minute >=60) 
		{
            minute = 0;
            hour++;
        }
        if (hour > 12) 
		{
            hour = 1; 
		}
		if (hour == 12 && minute == 0 && second == 0) 
		{
			timeformat = timeformat.equals("AM") ? "PM" : "AM"; 
        
		if (timeformat.equals("AM")) 
		{
            date = date.plusDays(1); 
        }
		}
	}	

    void decrementtime() 
	{
        second--;
        if (second < 0) 
		{
            second = 59;
            minute--;
        }
        if (minute < 0) 
		{
            minute = 59;
            hour--;
        }
        if (hour < 1) 
		{
            hour = 12; 
		}
		if (hour == 12 && minute == 00 && second == 00)
		{
            timeformat = timeformat.equals("AM") ? "PM" : "AM"; 
        
		if (timeformat.equals("PM")) 
		{
            date = date.minusDays(1); 
        }
		}
    }

    void displaymenu() 
	{
		System.out.println("\n***** Welcome to my DIGITAL CLOCK *****");
		System.out.println();
        System.out.println("1. Display Date and Time");
        System.out.println("2. Update Time");
        System.out.println("3. Check Time Format");
        System.out.println("4. Increment Time");
        System.out.println("5. Decrement Time");
        System.out.println("6. Exit");
    }

    public static void main(String[] args)
	{
        Scanner sc = new Scanner(System.in);
        Digitalclock digitalclock = new Digitalclock();

        while (true) 
		{
            digitalclock.displaymenu();
            System.out.print("Enter your choice: ");
            
			int choice;
            try 
			{
                choice = sc.nextInt();
				sc.nextLine(); 
            } 
			catch (InputMismatchException e)
			{
                System.out.println("Invalid input! Please enter a number.");
                sc.nextLine(); 
                continue;
            }

            switch (choice) 
			{
                case 1:
                    digitalclock.displaytime();
                    break;
                case 2:
				try
				{
                    System.out.print("Enter new hour (1-12): ");
                    int newHour = sc.nextInt();
                    System.out.print("Enter new minute (0-59): ");
                    int newMinute = sc.nextInt();
                    System.out.print("Enter new second (0-59): ");
                    int newSecond = sc.nextInt();
                    System.out.print("Enter AM or PM: ");
                    String newTimeformat = sc.next();
					
                    digitalclock.updatetime(newHour, newMinute, newSecond, newTimeformat);
                }
				catch (InputMismatchException e) 
				{
                        System.out.println("Invalid input! Please enter numbers for time values.");
                        sc.nextLine(); 
                }
                    break;
                case 3:
                    digitalclock.checktimeformat();
                    break;
                case 4:
                    digitalclock.incrementtime();
					digitalclock.displaytime(); 
                    break;
                case 5:
                    digitalclock.decrementtime();
					digitalclock.displaytime(); 
                    break;
                case 6:
                    System.out.println("Exiting...");
                    sc.close();
                    return;
                default:
                    System.out.println("Invalid choice. Please try again.");
            }
        }
    }
}