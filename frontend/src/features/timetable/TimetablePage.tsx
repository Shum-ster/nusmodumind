export function TimetablePage() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'];

  const schedule = {
    'Monday-09:00 AM': { title: 'React Basics', room: 'Lab 1', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    'Wednesday-11:00 AM': { title: 'UI Design', room: 'Studio 4', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    'Friday-03:00 PM': { title: 'Project Review', room: 'Zoom', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Weekly Timetable</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-6 bg-gray-50 border-b border-gray-200 text-center font-semibold text-sm text-gray-600 py-3">
          <div>Time</div>
          {days.map(day => <div key={day}>{day}</div>)}
        </div>

        {times.map(time => (
          <div key={time} className="grid grid-cols-6 border-b border-gray-100 min-h-[80px] items-stretch">
            <div className="bg-gray-50/50 flex items-center justify-center text-xs font-medium text-gray-400 border-r border-gray-100">{time}</div>
            {days.map(day => {
              const slotKey = `${day}-${time}`;
              const event = schedule[slotKey as keyof typeof schedule];
              return (
                <div key={slotKey} className="p-2 border-r border-gray-100 flex flex-col justify-center">
                  {event ? (
                    <div className={`p-2 rounded-lg border text-xs ${event.color}`}>
                      <p className="font-bold">{event.title}</p>
                      <p className="opacity-80">{event.room}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
