import random
import statistics

TRIALS = 10000
P_VALUES = [i / 10 for i in range(1, 10)]
Q_VALUES = [i / 10 for i in range(1, 10)]

def run_single_trial(p, q):
    # Step 1: Flip Coin 1 until first head appears
    N = 0
    while True:
        N += 1
        if random.random() < p:  # head with probability p
            break

    # Step 2: Flip Coin 2 N times and count heads
    Y = 0
    for _ in range(N):
        if random.random() < q:
            Y += 1

    return Y


def simulate(p, q):
    results = []
    for _ in range(TRIALS):
        y = run_single_trial(p, q)
        results.append(y)

    mean_estimate = statistics.mean(results)
    variance_estimate = statistics.variance(results)  # sample variance

    return mean_estimate, variance_estimate


def print_table(title, table):
    print(title)
    print(" q:", end="")
    for q in Q_VALUES:
        print(f" {q:.1f}", end="")
    print()
    print("p ------------------------------------------------------------------------")

    for i, p in enumerate(P_VALUES):
        print(f"{p:.1f} |", end=" ")
        for j in range(len(Q_VALUES)):
            print(f"{table[i][j]:.3f}", end=" ")
        print()
    print()


def main():
    mean_table = []
    var_table = []

    for p in P_VALUES:
        mean_row = []
        var_row = []
        for q in Q_VALUES:
            mean_est, var_est = simulate(p, q)
            mean_row.append(mean_est)
            var_row.append(var_est)
        mean_table.append(mean_row)
        var_table.append(var_row)

    print_table("mean", mean_table)
    print_table("variance", var_table)


if __name__ == "__main__":
    main()
