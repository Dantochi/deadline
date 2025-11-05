export function getUrgencyColor(deadlineDate: string): string{
    const now = new Date()
    const deadline = new Date(deadlineDate);
    const totalTime = deadline.getTime() - now.getTime();
    const daysRemaining = totalTime / (1000 * 60 * 60 * 24);

    if(daysRemaining <= 2 ){
        return "#FF6B6B"
    } else if (daysRemaining <= 7){
        return "#FFB74D"
    } else {
        return "#81C784"
    }
}